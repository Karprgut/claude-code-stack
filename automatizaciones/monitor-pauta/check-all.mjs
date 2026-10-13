#!/usr/bin/env node
// Monitor de pauta · TODAS las cuentas, TODAS las plataformas (cron cada 6 h).
//
// 29-sep-2026: sustituye a check-google.mjs, que vigilaba una lista fija de 5 campañas
// de un cliente en Google. Esa lista se desfasaba sola (4 campañas prendidas quedaron
// fuera) y el script murió 13 días sin avisar. Ahora:
//   · descubre solo lo que está ACTIVO en cada cuenta — no hay lista que mantener;
//   · compara contra un baseline y alerta cuando algo que servía deja de servir;
//   · alerta UNA vez por cambio (el baseline se actualiza siempre), no cada 6 h.
//
// Cobertura: Google Ads (4 cuentas) · Meta (6 cuentas) · TikTok (2 advertisers).
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { execSync } from 'node:child_process'; import { createRequire } from 'node:module';

const HOME = os.homedir();
const DIR = path.join(HOME, 'monitor-pauta');
const LOG = path.join(DIR, 'monitor.log');
const BASELINE = path.join(DIR, 'baseline.json');
const ALERT_FILE = path.join(HOME, 'Desktop', 'PAUTA-ALERTA.txt');
const stamp = () => new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });

// Candidatos de .env.local: un movimiento de repo no debe volver a cegar el monitor.
const ENV_CANDIDATES = [
  'Trabajo/flint/dashboard/.env.local', 'flint/dashboard/.env.local',
  'flint-app/flint-v1.0.0 2/dashboard/.env.local', 'Trabajo/flint-refocus/dashboard/.env.local',
].map(rel => path.join(HOME, rel));
const ENV_PATH = ENV_CANDIDATES.find(f => fs.existsSync(f));

// ─── Cuentas ────────────────────────────────────────────────────────────────
// Las cuentas se declaran aquí; si las tienes en una base, cárgalas desde ahí.
const GOOGLE = [
  { cid: '<CUSTOMER_ID>', login: null, cliente: 'Cliente A' },
  { cid: '<CUSTOMER_ID>', login: '<MCC_ID>', cliente: 'Cliente B' }, // con MCC propio
];
const META = [
  { act: 'act_<ID>', cliente: 'Cliente A' },
  { act: 'act_<ID>', cliente: 'Cliente B' },
];
const TIKTOK = [
  { adv: '<ADVERTISER_ID>', cliente: 'Cliente A', slug: 'CLA' },
];

const GOOGLE_OK = new Set(['ELIGIBLE', 'LIMITED', 'LEARNING']);
const API = 'v22';

function parseEnv(f){const o={};for(const raw of fs.readFileSync(f,'utf8').split('\n')){const l=raw.trim();if(!l||l.startsWith('#'))continue;const i=l.indexOf('=');if(i<0)continue;let k=l.slice(0,i).trim(),v=l.slice(i+1).trim();if((v[0]==='"'&&v.endsWith('"'))||(v[0]==="'"&&v.endsWith("'")))v=v.slice(1,-1);o[k]=v;}return o;}
function logline(s){ try{ fs.appendFileSync(LOG, `[${stamp()}] ${s}\n`); }catch(e){} }
function notify(t,m){ try{ execSync(`osascript -e ${JSON.stringify(`display notification ${JSON.stringify(m)} with title ${JSON.stringify(t)} sound name "Basso"`)}`); }catch(e){} }

// ─── Recolectores: devuelven [{key, cliente, plataforma, nombre, sirve, detalle, fin}] ───
async function googleToken(env){
  const r = await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({client_id:env.GOOGLE_ADS_CLIENT_ID,client_secret:env.GOOGLE_ADS_CLIENT_SECRET,refresh_token:env.GOOGLE_ADS_REFRESH_TOKEN,grant_type:'refresh_token'})});
  if(!r.ok) throw new Error('OAuth Google '+r.status);
  return (await r.json()).access_token;
}
async function collectGoogle(env, out, fallos){
  let tok; try{ tok = await googleToken(env); }catch(e){ fallos.push('Google OAuth: '+e.message); return; }
  for(const acc of GOOGLE){
    try{
      const r = await fetch(`https://googleads.googleapis.com/${API}/customers/${acc.cid}/googleAds:searchStream`,{method:'POST',
        headers:{Authorization:`Bearer ${tok}`,'developer-token':env.GOOGLE_ADS_DEVELOPER_TOKEN,'login-customer-id':acc.login||env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,'Content-Type':'application/json'},
        body:JSON.stringify({query:`SELECT campaign.id, campaign.name, campaign.status, campaign.primary_status, campaign.end_date FROM campaign WHERE campaign.status = 'ENABLED'`})});
      const t = await r.text();
      if(!r.ok){ fallos.push(`Google ${acc.cliente}: HTTP ${r.status}`); continue; }
      for(const ch of JSON.parse(t)){ for(const row of (ch.results||[])){
        const c = row.campaign;
        out.push({ key:`google:${acc.cid}:${c.id}`, cliente:acc.cliente, plataforma:'Google', nombre:c.name,
                   sirve: GOOGLE_OK.has(c.primaryStatus), detalle: c.primaryStatus || 'SIN_ESTADO', fin: c.endDate || null });
      }}
    }catch(e){ fallos.push(`Google ${acc.cliente}: ${e.message}`); }
  }
}
async function collectMeta(env, out, fallos){
  const tokens = ['META_TOKEN_1','META_TOKEN_2','META_TOKEN_3'].map(k=>env[k]).filter(Boolean);
  if(!tokens.length){ fallos.push('Meta: sin tokens en .env.local'); return; }
  for(const acc of META){
    let ok = false, ultimoErr = '';
    for(const tk of tokens){ // un token de System User puede ver muchas cuentas; los otros son de respaldo
      try{
        const u = new URL(`https://graph.facebook.com/v21.0/${acc.act}/campaigns`);
        u.searchParams.set('fields','id,name,status,effective_status,stop_time');
        u.searchParams.set('limit','200'); u.searchParams.set('access_token',tk);
        const r = await fetch(u); const d = await r.json();
        if(d.error){ ultimoErr = d.error.message; continue; }

        // En Meta "ACTIVE" no significa que entregue: un cliente tenía 57 campañas ACTIVE y solo 3
        // gastan (el resto son viejas con los ad sets apagados). Si contáramos esas como
        // vigiladas, pausar una zombie dispararía una alerta que no le importa a nadie.
        // Por eso el criterio de "sirve" en Meta es ACTIVE **y** con gasto en los últimos 7 días.
        const entregando = new Set();
        try{
          const ins = new URL(`https://graph.facebook.com/v21.0/${acc.act}/insights`);
          const hoy = new Date(), hace7 = new Date(Date.now()-7*864e5);
          const iso = dt => dt.toISOString().slice(0,10);
          ins.searchParams.set('time_range', JSON.stringify({since:iso(hace7), until:iso(hoy)}));
          ins.searchParams.set('fields','campaign_id,spend'); ins.searchParams.set('level','campaign');
          ins.searchParams.set('limit','500'); ins.searchParams.set('access_token',tk);
          const ri = await fetch(ins); const di = await ri.json();
          for(const row of (di.data||[])) if(parseFloat(row.spend) > 0) entregando.add(row.campaign_id);
        }catch(e){ /* sin señal de entrega: caemos al estado nominal, abajo */ }

        for(const c of (d.data||[])){
          if(c.effective_status !== 'ACTIVE' && c.status !== 'ACTIVE') continue; // solo lo activo
          const activa = c.effective_status === 'ACTIVE';
          out.push({ key:`meta:${acc.act}:${c.id}`, cliente:acc.cliente, plataforma:'Meta', nombre:c.name,
                     sirve: activa && entregando.has(c.id),
                     detalle: activa ? (entregando.has(c.id) ? 'ACTIVE' : 'ACTIVE_SIN_ENTREGA') : c.effective_status,
                     fin: c.stop_time ? String(c.stop_time).slice(0,10) : null });
        }
        ok = true; break;
      }catch(e){ ultimoErr = e.message; }
    }
    if(!ok) fallos.push(`Meta ${acc.cliente} (${acc.act}): ${ultimoErr||'sin acceso'}`);
  }
}
async function collectTiktok(env, out, fallos){
  let tokens = {};
  try{ // los access tokens de TikTok viven en Mongo (ad_clients), no en .env
    const req = createRequire(path.join(path.dirname(ENV_PATH),'package.json'));
    const { MongoClient } = req('mongodb');
    const cli = new MongoClient(env.MONGODB_URI); await cli.connect();
    for(const doc of await cli.db().collection('ad_clients').find({}).toArray())
      if(doc.tiktokAccessToken) tokens[doc._id] = doc.tiktokAccessToken;
    await cli.close();
  }catch(e){ fallos.push('TikTok: no pude leer tokens de Mongo ('+e.message+')'); return; }
  for(const acc of TIKTOK){
    const tk = tokens[acc.slug];
    if(!tk){ fallos.push(`TikTok ${acc.cliente}: sin token en Mongo`); continue; }
    try{
      const u = new URL('https://business-api.tiktok.com/open_api/v1.3/campaign/get/');
      u.searchParams.set('advertiser_id', acc.adv); u.searchParams.set('page_size','100');
      u.searchParams.set('fields', JSON.stringify(['campaign_id','campaign_name','operation_status','secondary_status']));
      const r = await fetch(u,{headers:{'Access-Token':tk}}); const d = await r.json();
      if(d.code !== 0){ fallos.push(`TikTok ${acc.cliente}: ${d.message}`); continue; }
      for(const c of (d.data?.list||[])){
        if(c.operation_status !== 'ENABLE') continue;
        out.push({ key:`tiktok:${acc.adv}:${c.campaign_id}`, cliente:acc.cliente, plataforma:'TikTok', nombre:c.campaign_name,
                   sirve: !String(c.secondary_status||'').includes('DELETE'), detalle: c.secondary_status || 'ENABLE', fin: null });
      }
    }catch(e){ fallos.push(`TikTok ${acc.cliente}: ${e.message}`); }
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────
try{
  if(!ENV_PATH) throw new Error('no encontré .env.local en: '+ENV_CANDIDATES.join(' | '));
  const env = parseEnv(ENV_PATH);
  const vivos = []; const fallos = [];
  await collectGoogle(env, vivos, fallos);
  await collectMeta(env, vivos, fallos);
  await collectTiktok(env, vivos, fallos);

  if(!vivos.length && fallos.length){ // no confundas "todo apagado" con "no pude consultar"
    logline('ERROR — ninguna plataforma respondió: '+fallos.join(' | '));
    notify('⚠ Monitor de pauta','No pude consultar ninguna cuenta. Ver monitor.log.');
    process.exit(1);
  }

  const previo = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE,'utf8')) : null;
  const ahora = Object.fromEntries(vivos.map(e => [e.key, e]));
  const problemas = []; const nuevas = [];

  if(previo){
    for(const [key, antes] of Object.entries(previo.entidades||{})){
      const hoy = ahora[key];
      const et = `${antes.cliente} · ${antes.plataforma} · ${antes.nombre}`;
      if(!hoy){ if(antes.sirve) problemas.push(`${et}: ya NO está activa (pausada, eliminada o fuera de la cuenta)`); continue; }
      if(antes.sirve && !hoy.sirve) problemas.push(`${et}: activa pero ya no sirve → ${hoy.detalle}`);
      if(hoy.fin && (!antes.fin || hoy.fin !== antes.fin) && hoy.fin < '2027-01-01')
        problemas.push(`${et}: le pusieron fecha de fin → ${hoy.fin}`);
    }
    for(const [key, e] of Object.entries(ahora))
      if(!previo.entidades?.[key]) nuevas.push(`${e.cliente} · ${e.plataforma} · ${e.nombre}`);
  }

  // El baseline se actualiza SIEMPRE: cada cambio alerta una vez y deja de taladrar.
  fs.writeFileSync(BASELINE, JSON.stringify({ actualizado: new Date().toISOString(), entidades: ahora }, null, 1));

  const resumen = `${vivos.length} campañas activas en ${new Set(vivos.map(e=>e.cliente)).size} clientes`;
  if(!previo){ logline(`BASELINE inicial — ${resumen}.` + (fallos.length?` Sin cobertura: ${fallos.join(' | ')}`:'')); process.exit(0); }

  if(problemas.length){
    const cuerpo = `${problemas.length} problema(s) en las cuentas de pauta:\n\n- ${problemas.join('\n- ')}\n\n`
      + (nuevas.length ? `Nuevas activas (informativo):\n- ${nuevas.join('\n- ')}\n\n` : '')
      + (fallos.length ? `Sin cobertura esta corrida:\n- ${fallos.join('\n- ')}\n\n` : '')
      + `Revisado: ${stamp()}\nRevisa la cuenta antes de asumir que fue un cambio propio.`;
    logline('ALERTA: '+problemas.join(' | '));
    try{ fs.writeFileSync(ALERT_FILE, '⚠ ALERTA — CUENTAS DE PAUTA\n\n'+cuerpo); }catch(e){}
    notify('⚠ Pauta — algo cambió', `${problemas.length} campaña(s) afectada(s). Ver PAUTA-ALERTA.txt en el Escritorio.`);
  } else {
    logline(`OK — ${resumen}.` + (nuevas.length?` Nuevas: ${nuevas.length}.`:'') + (fallos.length?` Sin cobertura: ${fallos.join(' | ')}`:''));
    try{ if(fs.existsSync(ALERT_FILE)) fs.unlinkSync(ALERT_FILE); }catch(e){}
  }
  if(fallos.length) logline('AVISO cobertura parcial: '+fallos.join(' | '));
}catch(err){
  logline('EXCEPCIÓN: '+(err&&err.message));
  notify('⚠ Monitor de pauta','Error inesperado. Ver monitor.log.');
  process.exit(1);
}
