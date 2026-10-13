import fs from 'node:fs';
const a = JSON.parse(fs.readFileSync('bitacora.json','utf8'));
const b = JSON.parse(fs.readFileSync('bitacora2.json','utf8'));
const redact = (s) => String(s||'')
  .replace(/\b(pass(?:word)?|contrase(?:ñ|n)a|clave|token|secret|api[_\s-]?key)\b(\s*(?:es|=|:)\s*)["'`]?([^\s"'`,;]{6,})/gi,(_m,k,sep)=>`${k}${sep}[REDACTADO]`)
  .replace(/client_secret_[\w.-]+\.apps\.googleusercontent\.com(\.json)?/gi,'[REDACTADO:oauth-client]')
  .replace(/\b\d{8,}-[a-z0-9]{16,}\.apps\.googleusercontent\.com/gi,'[REDACTADO:oauth-client]')
  .replace(/\b(sk-[A-Za-z0-9_-]{16,}|ghp_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|Bearer\s+[A-Za-z0-9._-]{20,})/g,'[REDACTADO]')
  .replace(/\b[A-Fa-f0-9]{40,}\b/g,'[REDACTADO:hash]');
let n=0;
for (const k of Object.keys(a)) {
  const have = new Set((b[k]||[]).map(s=>s.file));
  for (const s of a[k]) if (!have.has(s.file)) {
    s.prompts = s.prompts.map(p => redact(p.replace(/<\/?[a-z][^>]*>/gi,' ').replace(/\s+/g,' ').trim())).filter(Boolean);
    s.first = s.prompts[0]||null;
    s.rescued = true;
    (b[k] ||= []).push(s); n++;
    console.error('rescatada:', k, s.file.slice(0,8), String(s.start).slice(0,10));
  }
}
fs.writeFileSync('bitacora2.json', JSON.stringify(b,null,1));
console.error(`${n} sesiones rescatadas`);
