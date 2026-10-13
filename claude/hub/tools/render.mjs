import fs from 'node:fs';
const b = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const OUTDIR = process.argv[3];

const GROUPS = {
  'empresa-a.md': ['-Users-tuusuario-Trabajo-empresa-a'],
  'empresa-b.md': ['-Users-tuusuario-Trabajo-empresa-b', '-Users-tuusuario-empresa-b-viejo'],
};

const MES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

for (const [out, keys] of Object.entries(GROUPS)) {
  const sessions = keys.flatMap(k => (b[k] || []).map(s => ({ ...s, _dir: k })));
  sessions.sort((a, z) => String(a.start).localeCompare(String(z.start)));
  const lines = [];
  let curMonth = null;
  for (const s of sessions) {
    const d = String(s.start || '').slice(0, 10);
    const mk = d.slice(0, 7);
    if (mk !== curMonth) {
      curMonth = mk;
      const [y, m] = mk.split('-');
      lines.push('', `## ${MES[+m - 1] || m} ${y}`, '');
    }
    const head = (s.prompts[0] || '(sin prompt legible)').replace(/\|/g, '·');
    lines.push(`### ${d} — ${head.slice(0, 110)}${head.length > 110 ? '…' : ''}`);
    lines.push(`\`${s.file.slice(0, 8)}\` · ${s.turns} turnos${s.summary ? ` · ${s.summary}` : ''}`);
    lines.push('');
    for (const p of s.prompts.slice(0, 8)) lines.push(`- ${p.replace(/\|/g, '·')}`);
    lines.push('');
  }
  fs.writeFileSync(`${OUTDIR}/${out}`, lines.join('\n'));
  console.error(`${out}: ${sessions.length} sesiones`);
}
