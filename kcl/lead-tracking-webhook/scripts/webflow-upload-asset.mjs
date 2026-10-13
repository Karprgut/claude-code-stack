// Sube un archivo al Asset Manager del site de Webflow de TBP (API v2).
// Uso: WF_TOKEN=… node scripts/webflow-upload-asset.mjs <archivo>
// Imprime id, hostedUrl (S3) y la URL CDN equivalente (cdn.prod.website-files.com).
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { createHash } from 'node:crypto';

const SITE = process.env.WF_SITE_ID || '68ae09ab4fb8e082bdd9f99d';
const token = process.env.WF_TOKEN;
const file = process.argv[2];
if (!token || !file) { console.error('WF_TOKEN y <archivo> requeridos'); process.exit(1); }

const buf = readFileSync(file);
const fileName = basename(file);
const fileHash = createHash('md5').update(buf).digest('hex');

const r = await fetch(`https://api.webflow.com/v2/sites/${SITE}/assets`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', accept: 'application/json' },
  body: JSON.stringify({ fileName, fileHash })
});
const meta = await r.json();
if (!r.ok) { console.error('create asset failed', r.status, JSON.stringify(meta)); process.exit(1); }

const fd = new FormData();
for (const [k, v] of Object.entries(meta.uploadDetails || {})) fd.append(k, String(v));
fd.append('file', new Blob([buf], { type: meta.uploadDetails?.['content-type'] || 'application/pdf' }), fileName);
const up = await fetch(meta.uploadUrl, { method: 'POST', body: fd });
if (!(up.status === 201 || up.status === 204 || up.ok)) { console.error('S3 upload failed', up.status, (await up.text()).slice(0, 300)); process.exit(1); }

const hosted = meta.hostedUrl;
const cdn = hosted.replace('https://s3.amazonaws.com/webflow-prod-assets/', 'https://cdn.prod.website-files.com/');
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
let hostedOk = 0, cdnOk = 0;
for (let i = 0; i < 12; i++) {
  hostedOk = (await fetch(hosted, { method: 'HEAD' })).status;
  cdnOk = (await fetch(cdn, { method: 'HEAD' })).status;
  if (hostedOk === 200 && cdnOk === 200) break;
  await sleep(2500);
}
console.log(JSON.stringify({ id: meta.id, fileName, hostedUrl: hosted, cdnUrl: cdn, hostedStatus: hostedOk, cdnStatus: cdnOk }, null, 2));
