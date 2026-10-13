// TBP · Prueba de regresión del banner de cookies + form contra el sitio REAL
// (www.tu-sitio.com) usando Chrome headless vía CDP. Intercepta las peticiones a
// tbp-brevo-tracking.vercel.app y sirve los archivos LOCALES de public/ (así se
// prueba antes de deployar, sin depender del preview de Vercel, que pide login)
// y captura los POST a /api/consent y /api/attribution sin tocar la base.
// Uso: node scripts/cdp-consent-test.mjs   (imprime JSON con el resultado)
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9336; const DIR = '/tmp/tbp-cdp-profile-' + process.pid;
const LOCAL = new URL('../public/', import.meta.url).pathname;
const files = { '/cookie-consent.js': readFileSync(LOCAL + 'cookie-consent.js', 'utf8'), '/form-injection.js': readFileSync(LOCAL + 'form-injection.js', 'utf8') };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const chrome = spawn(CHROME, ['--headless', `--remote-debugging-port=${PORT}`, `--user-data-dir=${DIR}`, '--no-first-run', '--disable-gpu', '--window-size=1400,900', 'about:blank'], { stdio: 'ignore' });
let targets = null; for (let i = 0; i < 30 && !targets; i++) { await sleep(500); try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); } catch {} }
const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const pending = new Map(); const apiPosts = []; const errors = []; let phase = 'load'; const hosts = {};
const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); return; }
  if (d.method === 'Fetch.requestPaused') {
    const { requestId, request } = d.params; const u = new URL(request.url);
    if (files[u.pathname]) {
      send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/javascript; charset=utf-8' }, { name: 'Access-Control-Allow-Origin', value: '*' }], body: Buffer.from(files[u.pathname]).toString('base64') });
    } else if (u.pathname === '/api/consent' || u.pathname === '/api/attribution') {
      apiPosts.push({ phase, path: u.pathname, method: request.method, contentType: request.headers['Content-Type'] || request.headers['content-type'], body: request.postData });
      send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' }], body: Buffer.from('{"ok":true}').toString('base64') });
    } else { send('Fetch.continueRequest', { requestId }); }
  } else if (d.method === 'Runtime.exceptionThrown') {
    errors.push({ phase, text: (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text || '').slice(0, 200) });
  } else if (d.method === 'Network.requestWillBeSent') {
    try { const h = new URL(d.params.request.url).hostname; (hosts[phase] ??= {})[h] = ((hosts[phase] ??= {})[h] || 0) + 1; } catch {}
  }
};
const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;
await send('Network.enable'); await send('Page.enable'); await send('Runtime.enable');
await send('Fetch.enable', { patterns: [{ urlPattern: '*tbp-brevo-tracking.vercel.app/*', requestStage: 'Request' }] });
await send('Network.clearBrowserCookies');
await send('Page.navigate', { url: 'https://www.tu-sitio.com/' }); await sleep(9000);
const out = {};
out.load = await ev(`(() => {
  const b = document.getElementById('tbp-consent'); if (!b) return { banner: false };
  const cs = (el) => { const s = getComputedStyle(el); return { bg: s.backgroundColor, color: s.color, fontSize: s.fontSize, padding: s.padding, minWidth: s.minWidth, border: s.borderTopColor, display: s.display }; };
  const acc = document.getElementById('tbp-consent-accept'), rej = document.getElementById('tbp-consent-reject');
  const bs = getComputedStyle(b); const rect = b.getBoundingClientRect();
  const link = document.querySelector('a[href="#cookie-settings"]');
  return { banner: true, visible: bs.display !== 'none' && rect.height > 0 && rect.bottom <= window.innerHeight + 1, transform: bs.transform, zIndex: bs.zIndex,
    buttons: [...b.querySelectorAll('button')].map(x => x.textContent.trim()), accept: cs(acc), reject: cs(rej),
    footerLink: link ? { text: link.textContent, parentClass: link.parentElement.className, siblings: [...link.parentElement.querySelectorAll('a')].map(a => a.textContent.trim()) } : null,
    formLegal: !!document.getElementById('tbp-form-legal'), formLegalText: (document.getElementById('tbp-form-legal')?.textContent || '').replace(/\\s+/g,' ').trim(),
    firstTouchLS: localStorage.getItem('tbp_first_touch'), inMemoryFirstTouch: !!window.__tbpFirstTouch, cookieBefore: document.cookie, api: Object.keys(window.tbpConsent || {}) };
})()`);
phase = 'reject';
await ev(`document.getElementById('tbp-consent-reject').click()`); await sleep(2500);
out.reject = await ev(`(() => { const m = document.cookie.match(/tbp_consent=([^;]*)/); return { cookie: m ? JSON.parse(decodeURIComponent(m[1])) : null, bannerHidden: document.getElementById('tbp-consent').classList.contains('tbp-hidden'), reopener: !!document.getElementById('tbp-consent-reopen'), firstTouchLS: localStorage.getItem('tbp_first_touch'), fbq: typeof window.fbq } })()`);
phase = 'footer-link';
await ev(`document.querySelector('a[href="#cookie-settings"]').click()`); await sleep(800);
out.footerLinkOpensModal = await ev(`(() => { const m = document.getElementById('tbp-consent-modal'); return m ? { open: m.classList.contains('tbp-open'), toggles: [...m.querySelectorAll('input[data-cat]')].map(i => i.getAttribute('data-cat') + '=' + i.checked), buttons: [...m.querySelectorAll('button')].map(b => b.textContent.trim()), zIndex: getComputedStyle(m).zIndex } : null })()`);
await ev(`document.getElementById('tbp-consent-modal').click()`); await sleep(300);
out.modalClosedOnBackdrop = await ev(`!document.getElementById('tbp-consent-modal').classList.contains('tbp-open')`);
phase = 'reload';
await ev(`document.cookie = 'tbp_consent=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'; localStorage.removeItem('tbp_first_touch');`);
await send('Page.reload'); await sleep(9000);
out.reloadPre = await ev(`({ bannerVisible: !!document.getElementById('tbp-consent') && !document.getElementById('tbp-consent').classList.contains('tbp-hidden'), firstTouchLS: localStorage.getItem('tbp_first_touch'), inMemory: !!window.__tbpFirstTouch, fbq: typeof window.fbq })`);
phase = 'accept';
await ev(`document.getElementById('tbp-consent-accept').click()`); await sleep(6000);
out.accept = await ev(`(() => { const m = document.cookie.match(/tbp_consent=([^;]*)/); return { cookie: m ? JSON.parse(decodeURIComponent(m[1])) : null, fbq: typeof window.fbq, firstTouchLS: localStorage.getItem('tbp_first_touch'), consentUpdates: (window.dataLayer||[]).filter(x => x && x[0]==='consent' && x[1]==='update').length, tbpEvents: (window.dataLayer||[]).filter(x => x && x.event==='tbp_consent_update').map(x => x.consent_marketing), reopener: !!document.getElementById('tbp-consent-reopen') } })()`);
out.acceptCookies = (await send('Network.getAllCookies')).result.cookies.map(c => c.name).sort();
out.apiPosts = apiPosts.map(p => ({ ...p, body: p.body ? JSON.parse(p.body) : null }));
out.errors = errors;
out.thirdPartyAfterAccept = Object.keys(hosts.accept || {}).filter(h => /facebook|brevo|sibautomation|google|doubleclick/.test(h)).sort();
console.log(JSON.stringify(out, null, 2));
ws.close(); chrome.kill();
