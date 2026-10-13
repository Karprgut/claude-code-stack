// TBP · Regresión v4 del tracking del form (17-sep-2026) contra el sitio REAL
// (www.tu-sitio.com) con Chrome headless vía CDP, SIN ensuciar datos:
//   · sirve los archivos LOCALES de public/ (default) o los de producción (--live)
//   · bloquea el POST real a sibforms.com (no crea contacto en Brevo)
//   · captura y bloquea los beacons de GA4 / Google Ads / Meta (no cuentan)
//   · captura los POST a /api/attribution y /api/consent (no tocan Redis)
// Comprueba: (1) submit inválido → 0 atribución; (2) submit del CHIP → 1 POST de
// atribución con ga_session_id numérico (cookie GS2); (3) éxito simulado → 1 sola
// conversión, 1 generate_lead client-side con sid/cid reales, 1 flag ga_client_sent.
// Uso:  node scripts/cdp-v4-test.mjs          (local: public/)
//       node scripts/cdp-v4-test.mjs --live   (producción)
//       --form=0 prueba el form del pop-up Contact (default --form=1 = chip)
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'; const PORT=9361; const DIR='/tmp/tbp-v4-'+process.pid;
const LOCAL=process.argv.includes('--live') ? '' : fileURLToPath(new URL('../public', import.meta.url));
const files = LOCAL ? { '/form-injection.js': readFileSync(LOCAL+'/form-injection.js','utf8'), '/cookie-consent.js': readFileSync(LOCAL+'/cookie-consent.js','utf8') } : {};
const FORM_IDX=Number((process.argv.find(a=>a.startsWith('--form='))||'--form=1').split('=')[1]); // 0 = pop-up Contact, 1 = chip flotante
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const chrome=spawn(CHROME,['--headless=new',`--remote-debugging-port=${PORT}`,`--user-data-dir=${DIR}`,'--no-first-run','--disable-gpu','--window-size=1400,900','about:blank'],{stdio:'ignore'});
let targets=null; for(let i=0;i<30&&!targets;i++){await sleep(500);try{targets=await(await fetch(`http://127.0.0.1:${PORT}/json`)).json();}catch{}}
const ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl); await new Promise(r=>ws.onopen=r);
let id=0; const pending=new Map(); const captured=[]; const errors=[]; let phase='load';
const send=(m,p={})=>new Promise(r=>{const i=++id;pending.set(i,r);ws.send(JSON.stringify({id:i,method:m,params:p}));});
ws.onmessage=(m)=>{const d=JSON.parse(m.data);
  if(d.id&&pending.has(d.id)){pending.get(d.id)(d);pending.delete(d.id);return;}
  if(d.method==='Fetch.requestPaused'){const {requestId,request}=d.params; const u=new URL(request.url);
    if(files[u.pathname]&&u.hostname==='tbp-brevo-tracking.vercel.app'){send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/javascript; charset=utf-8'},{name:'Access-Control-Allow-Origin',value:'*'}],body:Buffer.from(files[u.pathname]).toString('base64')});return;}
    if(u.hostname==='tbp-brevo-tracking.vercel.app'&&u.pathname.startsWith('/api/')){captured.push({phase,kind:'api',path:u.pathname,method:request.method,body:request.postData||''});
      send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/json'},{name:'Access-Control-Allow-Origin',value:'*'},{name:'Access-Control-Allow-Headers',value:'Content-Type'},{name:'Access-Control-Allow-Methods',value:'POST, OPTIONS'}],body:Buffer.from('{"ok":true}').toString('base64')});return;}
    if(/sibforms\.com/.test(u.hostname)){captured.push({phase,kind:'brevo',url:u.href.slice(0,80),method:request.method}); send('Fetch.failRequest',{requestId,errorReason:'BlockedByClient'});return;}
    if(/google-analytics\.com|analytics\.google\.com|facebook\.com|doubleclick\.net|googleadservices\.com|google\.com\/pagead/.test(u.href)){
      if(/facebook\.com\/tr|\/g\/collect|\/collect|pagead\/conversion|pagead\/1p-conversion|pagead\/viewthroughconversion/.test(u.href)){captured.push({phase,kind:'beacon',url:u.href.slice(0,300),post:(request.postData||'').slice(0,300)}); send('Fetch.failRequest',{requestId,errorReason:'BlockedByClient'});return;}
    }
    send('Fetch.continueRequest',{requestId});}
  else if(d.method==='Runtime.exceptionThrown'){errors.push({phase,text:(d.params.exceptionDetails.exception?.description||d.params.exceptionDetails.text||'').slice(0,200)});}
};
const ev=async e=>{const r=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true}); return r.result?.result?.value ?? ('EXC: '+JSON.stringify(r.result?.exceptionDetails?.exception?.description||r.result?.exceptionDetails?.text));};
await send('Network.enable'); await send('Page.enable'); await send('Runtime.enable');
await send('Fetch.enable',{patterns:[{urlPattern:'*',requestStage:'Request'}]});
await send('Network.clearBrowserCookies');
await send('Page.navigate',{url:'https://www.tu-sitio.com/?utm_source=test&utm_medium=cdp&utm_campaign=v4check'}); await sleep(9000);
phase='consent'; await ev(`document.getElementById('tbp-consent-accept').click()`); await sleep(5000);
const cookies=(await send('Network.getAllCookies')).result.cookies; const ga=cookies.find(c=>c.name.startsWith('_ga_'));
console.log('ga session cookie:', ga? ga.value : '(none)');
console.log('forms:', await ev(`document.querySelectorAll('#sib-form').length`), '| delegated flag:', await ev(`!!window.__tbpTrackingDelegated`), '| tracking export:', await ev(`JSON.stringify(Object.keys(window.__tbpBrevoTracking||{}))`));
// 1) submit INVÁLIDO (vacío) en el chip → NO debe mandar atribución
phase='invalid'; console.log('invalid dispatch:', await ev(`(function(){var f=document.querySelectorAll('#sib-form')[${FORM_IDX}]; if(!f) return 'no chip form'; f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})); return 'dispatched'})()`)); await sleep(2500);
// 2) llenar el chip y enviar
phase='chip-submit';
console.log('fill:', await ev(`(function(){var f=document.querySelectorAll('#sib-form')[${FORM_IDX}]; if(!f) return 'no chip form';
  f.querySelectorAll('input,textarea,select').forEach(function(i){ var n=(i.name||''); var t=(i.type||'').toLowerCase();
    if(n==='EMAIL') i.value='prueba@tu-dominio.com';
    else if(n==='NOMBRE') i.value='Prueba Claude v4';
    else if(n==='SMS') i.value='5512345678';
    else if(n==='SMS__COUNTRY_CODE'){ var o=Array.from(i.options).find(function(o){return o.value==='+52';}); if(o) i.value='+52'; i.dispatchEvent(new Event('change',{bubbles:true})); }
    else if(n==='TELL_US_ABOUT') i.value='Prueba automatizada v4 del tracking, ignorar.';
    else if(n==='email_address_check') i.value='';
    else if(t==='select-one'){ var o2=Array.from(i.options).find(function(o){return o.value&&o.value!=='';}); if(o2) i.value=o2.value; i.dispatchEvent(new Event('change',{bubbles:true})); }
  });
  var r=f.querySelector('input[type=radio][name=CATEGORY]'); if(r){ r.checked=true; r.dispatchEvent(new Event('change',{bubbles:true})); }
  f.querySelectorAll('input[type=checkbox]').forEach(function(c){ c.checked=true; c.dispatchEvent(new Event('change',{bubbles:true})); });
  return 'filled ' + f.querySelectorAll('input,select,textarea').length + ' fields'; })()`));
console.log('submit:', await ev(`(function(){var f=document.querySelectorAll('#sib-form')[${FORM_IDX}]; f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})); return 'dispatched'})()`)); await sleep(3000);
console.log('invalid fields after submit:', await ev(`(function(){var f=document.querySelectorAll('#sib-form')[${FORM_IDX}]; var scope=f.closest('.sib-form-container')||f.parentNode; return JSON.stringify({invalid:Array.from(scope.querySelectorAll('.tbp-invalid, .tbp-radio-group-invalid')).map(function(el){ var i=el.matches('input,select,textarea')?el:el.querySelector('input,select,textarea'); return (el.className||'').slice(0,40)+' name='+(i?i.name:'?')+' val='+(i?String(i.value).slice(0,20):'')+' type='+(i?i.type:''); }), status:(scope.querySelector('.tbp-form-status, [class*=status]')||{}).textContent, fields:Array.from(f.querySelectorAll('input,select,textarea')).map(function(i){return i.name+':'+i.type+':'+String(i.value).slice(0,15);})}); })()`));
// 3) simular éxito de Brevo en el scope del chip
await ev(`(function(){ window.__beacons=[]; var sb=navigator.sendBeacon.bind(navigator); navigator.sendBeacon=function(u,b){ window.__beacons.push({t:'beacon',u:String(u).slice(0,3000),b:(typeof b==='string'?b:'[non-string:'+Object.prototype.toString.call(b)+']').slice(0,3000)}); return sb(u,b); }; var of=window.fetch; window.fetch=function(u,o){ try{ window.__beacons.push({t:'fetch',u:String(u).slice(0,3000),b:String((o&&o.body)||'').slice(0,3000)}); }catch(_){} return of.apply(this,arguments); }; var oo=XMLHttpRequest.prototype.open, os=XMLHttpRequest.prototype.send; XMLHttpRequest.prototype.open=function(m,u){ this.__u=String(u); return oo.apply(this,arguments); }; XMLHttpRequest.prototype.send=function(b){ window.__beacons.push({t:'xhr',u:(this.__u||'').slice(0,3000),b:String(b||'').slice(0,500)}); return os.apply(this,arguments); }; return 'instrumented'; })()`);
phase='success';
console.log('success sim:', await ev(`(function(){var f=document.querySelectorAll('#sib-form')[${FORM_IDX}]; var scope=f.closest('.sib-form-container')||f.parentNode; var p=scope.querySelector('#success-message'); if(!p) return 'no success panel'; p.textContent='Thank you for reaching out'; p.classList.add('sib-form-message-panel--active'); return 'activated'})()`)); await sleep(6000);
console.log('\n=== CAPTURED ===');
for(const c of captured){ if(c.kind==='api') console.log(`[${c.phase}] ${c.method} ${c.path} ${c.body.slice(0,400)}`); else if(c.kind==='brevo') console.log(`[${c.phase}] brevo ${c.method} ${c.url}`); else { const u=new URL(c.url); const q=u.searchParams; const en=q.get('en')||(c.post.match(/en=([^&\n]+)/)||[])[1]||q.get('ev')||''; console.log(`[${c.phase}] beacon ${u.hostname}${u.pathname} en/ev=${en} tid=${q.get('tid')||q.get('id')||''} sid=${q.get('sid')||''} cid=${(q.get('cid')||'').slice(0,20)} ${c.post?'| post: '+c.post.slice(0,120):''}`); } }
const beacons = JSON.parse(await ev(`JSON.stringify((window.__beacons||[]).filter(function(x){return x.u.indexOf('collect')>-1 || x.u.indexOf('google-analytics')>-1;}))`) || '[]');
console.log('\n=== GA4 client beacons after success ===');
console.log('fbq:', await ev(`typeof window.fbq + (window.fbq&&window.fbq.loaded?' loaded':' NOT loaded') + ' | fbevents script: ' + !!document.querySelector('script[src*="connect.facebook.net"]') + ' | _fbp: ' + /_fbp=/.test(document.cookie)`), '| gtag configured:', await ev(`!!window.__tbpGa4Configured`), '| dataLayer gtag cmds for G-:', await ev(`JSON.stringify((window.dataLayer||[]).filter(function(x){return x && x[0] && (x[1]==='G-XXXXXXXXXX' || (x[2]&&x[2].send_to==='G-XXXXXXXXXX'));}).map(function(x){return x[0]+' '+x[1];}))`));
for (const b of beacons) { console.log('  RAW', b.t, b.u.slice(0,900).replace(/&/g,' &'), '| body:', b.b.slice(0,300)); const u=new URL(b.u, 'https://x'); const q=u.searchParams; const ens=[q.get('en'), ...(b.b.match(/en=[^&\n]+/g)||[])].filter(Boolean); console.log(` ${b.t} ${u.hostname}${u.pathname} tid=${q.get('tid')} cid=${(q.get('cid')||'').slice(0,22)} sid=${q.get('sid')} sct=${q.get('sct')} | events: ${ens.join(', ')||'(none)'} ${/generate_lead/.test(b.u+b.b)?'  <<< generate_lead':''}`); }
console.log('attribution POSTs by phase:', JSON.stringify(captured.filter(c=>c.kind==='api'&&c.path==='/api/attribution'&&c.method==='POST').reduce((a,c)=>(a[c.phase]=(a[c.phase]||0)+1,a),{})));
console.log('conversion beacons (google ads) in success:', captured.filter(c=>c.kind==='beacon'&&c.phase==='success'&&/pagead\/conversion/.test(c.url)).length, '| fb Lead:', captured.filter(c=>c.kind==='beacon'&&/facebook\.com\/tr/.test(c.url)&&/ev=Lead/.test(c.url)).length);
console.log('errors:', JSON.stringify(errors));
ws.close(); chrome.kill(); process.exit(0);
