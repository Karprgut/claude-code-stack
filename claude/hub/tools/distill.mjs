// Destila transcripts .jsonl de Claude Code en una bitácora por proyecto.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const ROOT = `${process.env.HOME}/.claude/projects`;
const OUT = process.argv[2] || '/tmp/bitacora.json';

// Quita credenciales antes de que toquen disco. La bitácora es texto plano.
const redact = (s) => String(s || '')
  // agrega aquí los patrones propios de contraseña de tu equipo
  // "pass: X", "el token es X", "contraseña X", "api key = X"
  .replace(/\b(pass(?:word)?|contrase(?:ñ|n)a|clave|token|secret|api[_\s-]?key)\b(\s*(?:es|=|:)\s*)["'`]?([^\s"'`,;]{6,})/gi,
           (_m, k, sep) => `${k}${sep}[REDACTADO]`)
  // credenciales OAuth de Google y llaves de proveedores conocidos
  .replace(/client_secret_[\w.-]+\.apps\.googleusercontent\.com(\.json)?/gi, '[REDACTADO:oauth-client]')
  .replace(/\b\d{8,}-[a-z0-9]{16,}\.apps\.googleusercontent\.com/gi, '[REDACTADO:oauth-client]')
  .replace(/\b(sk-[A-Za-z0-9_-]{16,}|ghp_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|Bearer\s+[A-Za-z0-9._-]{20,})/g, '[REDACTADO]')
  .replace(/\b[A-Fa-f0-9]{40,}\b/g, '[REDACTADO:hash]');

const clean = (s) => redact(String(s || '')
  .replace(/<[^>]*>[\s\S]*?<\/[^>]*>/g, ' ')   // bloques tipo <system-reminder>
  .replace(/<\/?[a-z][^>]*>/gi, ' ')           // etiquetas sueltas (task-notification, etc.)
  .replace(/```[\s\S]*?```/g, ' [código] ')
  .replace(/\s+/g, ' ')
  .trim());

const isNoise = (t) => !t
  || t.startsWith('Caveat:')
  || t.startsWith('<command-')
  || t.startsWith('[Request interrupted')
  || t.startsWith('This session is being continued')
  || t.startsWith('Analysis:')
  || /^API Error/.test(t);

async function readSession(file) {
  const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
  const s = { file: path.basename(file), cwd: null, first: null, prompts: [], summary: null, start: null, end: null, turns: 0, tools: {} };
  for await (const line of rl) {
    if (!line.trim()) continue;
    let o; try { o = JSON.parse(line); } catch { continue; }
    if (o.type === 'summary' && o.summary) { s.summary = o.summary; continue; }
    if (o.cwd && !s.cwd) s.cwd = o.cwd;
    if (o.timestamp) { if (!s.start) s.start = o.timestamp; s.end = o.timestamp; }
    if (o.type === 'assistant' && o.message?.content) {
      for (const c of o.message.content) if (c.type === 'tool_use') s.tools[c.name] = (s.tools[c.name] || 0) + 1;
    }
    if (o.type !== 'user' || o.isMeta) continue;
    const c = o.message?.content;
    let txt = '';
    if (typeof c === 'string') txt = c;
    else if (Array.isArray(c)) txt = c.filter(x => x.type === 'text').map(x => x.text).join(' ');
    txt = clean(txt);
    if (isNoise(txt) || txt.length < 8) continue;
    s.turns++;
    if (s.prompts.length < 14) s.prompts.push(txt.slice(0, 300));
  }
  s.first = s.prompts[0] || null;
  return s;
}

const out = {};
for (const dir of fs.readdirSync(ROOT)) {
  const p = path.join(ROOT, dir);
  if (!fs.statSync(p).isDirectory()) continue;
  const files = fs.readdirSync(p).filter(f => f.endsWith('.jsonl'));
  if (!files.length) continue;
  const sessions = [];
  for (const f of files) {
    try { sessions.push(await readSession(path.join(p, f))); }
    catch (e) { sessions.push({ file: f, error: String(e).slice(0, 120) }); }
  }
  sessions.sort((a, b) => String(a.start).localeCompare(String(b.start)));
  out[dir] = sessions;
  console.error(`${dir}: ${sessions.length} sesiones`);
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.error('OK →', OUT);
