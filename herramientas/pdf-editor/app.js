import * as pdfjsLib from './vendor/pdf.min.mjs';
import { stripTextInBoxes } from './strip.js';
pdfjsLib.GlobalWorkerOptions.workerSrc = './vendor/pdf.worker.min.mjs';

const $ = (s) => document.querySelector(s);
const el = {
  main: $('#main'), drop: $('#drop'), pages: $('#pages'), file: $('#file'),
  status: $('#status'), meta: $('#meta'), toolbar: $('#toolbar'),
  btnOpen: $('#btn-open'), btnPick: $('#btn-pick'), btnAdd: $('#btn-add'),
  btnReset: $('#btn-reset'), btnSave: $('#btn-save'), btnMore: $('#btn-more'),
  workspace: $('#workspace'), filesList: $('#files-list'), filesCount: $('#files-count'),
  tbSize: $('#tb-size'), tbColor: $('#tb-color'),
  tbBold: $('#tb-bold'), tbItalic: $('#tb-italic'), tbRevert: $('#tb-revert'),
};

const RENDER_SCALE = 2;          // nitidez del canvas
const state = {
  docs: [],                      // { name, bytes, pages } en el orden del documento final
  name: 'documento',
  saveBytes: null,               // copia intacta para pdf-lib
  doc: null,
  pages: [],                     // { num, viewport, wrap, layer, canvas, ctx, rendered, lines[] }
  active: null,                  // línea enfocada
  addMode: false,
  seq: 0,
};

/* ---------------------------------------------------------------- utilidades */
function status(msg, kind) {
  if (!msg) { el.status.hidden = true; return; }
  el.status.hidden = false;
  el.status.textContent = msg;
  el.status.className = 'status' + (kind === 'err' ? ' err' : '');
}
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const toHex = (c) => '#' + c.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
// multiplicación de matrices [a b c d e f]
function mul(m1, m2) {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

/* ---------------------------------------------- carga en lote y unificación */
async function addFiles(fileList) {
  const list = [...fileList].filter((f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
  if (!list.length) return status('Ningún archivo PDF válido.', 'err');
  if (state.docs.length && !confirmRebuild()) return;
  status(`Leyendo ${list.length} archivo${list.length > 1 ? 's' : ''}…`);
  const added = [];
  for (const f of list) {
    try {
      const bytes = new Uint8Array(await f.arrayBuffer());
      const probe = await PDFLib.PDFDocument.load(bytes.slice(0), { ignoreEncryption: true });
      added.push({ name: f.name, bytes, pages: probe.getPageCount() });
    } catch (err) {
      console.error(err);
      status(`No se pudo leer ${f.name}: ${err.message}`, 'err');
    }
  }
  if (!added.length) return;
  state.docs.push(...added);
  await rebuild();
}

function totalPages() { return state.docs.reduce((n, d) => n + d.pages, 0); }

async function rebuild() {
  if (!state.docs.length) return clearAll();
  const multi = state.docs.length > 1;
  status(multi ? `Unificando ${state.docs.length} documentos (${totalPages()} páginas)…` : 'Abriendo documento…');
  try {
    let bytes;
    if (!multi) {
      bytes = state.docs[0].bytes.slice(0);           // un solo archivo: se respeta tal cual
    } else {
      const out = await PDFLib.PDFDocument.create();
      for (const d of state.docs) {
        const src = await PDFLib.PDFDocument.load(d.bytes.slice(0), { ignoreEncryption: true });
        const copied = await out.copyPages(src, src.getPageIndices());
        copied.forEach((pg) => out.addPage(pg));
      }
      bytes = await out.save();
    }
    state.saveBytes = bytes.slice(0);
    const base = state.docs[0].name.replace(/\.pdf$/i, '');
    state.name = multi ? `${base}-unificado` : base;
    await renderDocument(bytes);
    renderFileList();
    status(multi
      ? `${state.docs.length} documentos unificados · ${totalPages()} páginas. Haz clic en cualquier línea para editarla.`
      : 'Listo. Haz clic en cualquier línea de texto para editarla.');
    setTimeout(() => status(''), 6000);
  } catch (err) {
    console.error(err);
    status('No se pudo preparar el documento: ' + err.message, 'err');
  }
}

async function renderDocument(bytes) {
  if (state.doc) { try { await state.doc.destroy(); } catch (_) {} }
  state.pages = []; state.active = null; state.seq = 0; state.addMode = false;
  el.btnAdd.classList.remove('on');
  el.pages.innerHTML = '';
  hideToolbar();

  state.doc = await pdfjsLib.getDocument({ data: new Uint8Array(bytes), useSystemFonts: true }).promise;
  el.drop.hidden = true;
  el.workspace.hidden = false;
  el.meta.textContent = `${state.doc.numPages} página${state.doc.numPages > 1 ? 's' : ''}`;

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { io.unobserve(e.target); renderPage(+e.target.dataset.page); }
    }
  }, { rootMargin: '400px' });

  for (let n = 1; n <= state.doc.numPages; n++) {
    const page = await state.doc.getPage(n);
    const viewport = page.getViewport({ scale: 1 });
    const wrap = document.createElement('div');
    wrap.className = 'page';
    wrap.dataset.page = n;
    wrap.style.aspectRatio = `${viewport.width} / ${viewport.height}`;
    wrap.innerHTML = `<span class="num">P${String(n).padStart(2, '0')}</span>`;
    const canvas = document.createElement('canvas');
    const layer = document.createElement('div');
    layer.className = 'layer';
    wrap.append(canvas, layer);
    el.pages.append(wrap);
    state.pages[n] = { num: n, page, viewport, wrap, canvas, layer, rendered: false, lines: [] };
    io.observe(wrap);
    new ResizeObserver(() => {
      wrap.style.setProperty('--s', (wrap.clientWidth / viewport.width) || 1);
    }).observe(wrap);
    wrap.style.setProperty('--s', (wrap.clientWidth / viewport.width) || 1);
    layer.addEventListener('click', (ev) => onLayerClick(ev, n));
  }
  el.btnAdd.disabled = false; el.btnReset.disabled = false; el.btnSave.disabled = false;
  updateCount();
}

function clearAll() {
  state.docs = []; state.pages = []; state.doc = null; state.saveBytes = null;
  el.pages.innerHTML = ''; el.workspace.hidden = true; el.drop.hidden = false;
  el.meta.textContent = '';
  el.btnAdd.disabled = true; el.btnReset.disabled = true; el.btnSave.disabled = true;
  hideToolbar(); updateCount();
}

/* --------------------------------------------------- lista de documentos */
function pendingEdits() {
  let n = 0; eachLine((L) => { if (L.edited) n++; });
  return n;
}
function confirmRebuild() {
  const n = pendingEdits();
  return !n || confirm(`Tienes ${n} cambio(s) sin descargar. Al reacomodar los documentos se rehace el archivo y se pierden. ¿Continuar?`);
}

function renderFileList() {
  el.filesCount.textContent = state.docs.length;
  el.filesList.innerHTML = '';
  state.docs.forEach((d, i) => {
    const li = document.createElement('li');
    li.className = 'file-item';
    li.innerHTML = `
      <span class="file-num">${String(i + 1).padStart(2, '0')}</span>
      <span class="file-meta">
        <span class="file-name" title="${d.name.replace(/"/g, '&quot;')}">${d.name}</span>
        <span class="file-pages">${d.pages} pág</span>
      </span>
      <span class="file-ops">
        <button class="iconbtn up" title="Subir" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button class="iconbtn down" title="Bajar" ${i === state.docs.length - 1 ? 'disabled' : ''}>↓</button>
        <button class="iconbtn del" title="Quitar">✕</button>
      </span>`;
    li.querySelector('.up').addEventListener('click', () => moveDoc(i, -1));
    li.querySelector('.down').addEventListener('click', () => moveDoc(i, 1));
    li.querySelector('.del').addEventListener('click', () => removeDoc(i));
    el.filesList.append(li);
  });
}
async function moveDoc(i, dir) {
  const j = i + dir;
  if (j < 0 || j >= state.docs.length) return;
  if (!confirmRebuild()) return;
  const [d] = state.docs.splice(i, 1);
  state.docs.splice(j, 0, d);
  await rebuild();
}
async function removeDoc(i) {
  if (!confirmRebuild()) return;
  state.docs.splice(i, 1);
  await rebuild();
}

async function renderPage(n) {
  const P = state.pages[n];
  if (!P || P.rendered) return;
  P.rendered = true;
  const vp = P.page.getViewport({ scale: RENDER_SCALE });
  P.canvas.width = Math.floor(vp.width);
  P.canvas.height = Math.floor(vp.height);
  const ctx = P.canvas.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, P.canvas.width, P.canvas.height);
  await P.page.render({ canvasContext: ctx, viewport: vp }).promise;
  P.ctx = ctx;
  await buildLines(P);
}

/* ------------------------------------------- extracción y agrupado por línea */
function realFontName(P, fontName) {
  if (!P._fonts) P._fonts = new Map();
  if (P._fonts.has(fontName)) return P._fonts.get(fontName);
  let name = '';
  try {
    if (P.page.commonObjs.has(fontName)) {
      const o = P.page.commonObjs.get(fontName);
      name = (o && (o.name || o.fallbackName)) || '';
    }
  } catch (_) {}
  P._fonts.set(fontName, name);
  return name;
}
function prettyFont(raw) {
  return (raw || '')
    .replace(/^[A-Z]{6}\+/, '')
    .replace(/[-_,]?(Regular|Bold|Italic|Oblique|Light|Medium|SemiBold|DemiBold|Black|Heavy|Thin|Book|Roman|MT|PS)+$/gi, '')
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim();
}

async function buildLines(P) {
  const tc = await P.page.getTextContent();
  const vt = P.viewport.transform;          // scale 1 => coords en puntos, y hacia abajo
  const raw = [];
  for (const it of tc.items) {
    if (!it.str || !it.str.trim()) continue;
    const t = mul(vt, it.transform);
    const size = Math.hypot(t[2], t[3]) || Math.abs(it.height) || 10;
    if (size < 1) continue;
    const st = tc.styles[it.fontName] || {};
    const real = realFontName(P, it.fontName);
    raw.push({
      real,
      str: it.str,
      x: t[4], y: t[5], size,
      w: it.width || 0,
      asc: typeof st.ascent === 'number' && st.ascent > 0 ? st.ascent : 0.78,
      desc: typeof st.descent === 'number' && st.descent < 0 ? Math.abs(st.descent) : 0.22,
      family: st.fontFamily || 'sans-serif',
      font: it.fontName || '',
      eol: !!it.hasEOL,
    });
  }
  raw.sort((a, b) => (Math.abs(a.y - b.y) > 2 ? a.y - b.y : a.x - b.x));

  const groups = [];
  let g = null;
  for (const it of raw) {
    const fits = g &&
      Math.abs(it.y - g.y) <= Math.max(1.2, 0.35 * Math.max(it.size, g.size)) &&
      it.size / g.size > 0.6 && it.size / g.size < 1.7 &&
      it.x >= g.right - it.size * 0.6 && it.x <= g.right + it.size * 1.6 &&
      !g.closed;
    if (!fits) {
      g = { y: it.y, x: it.x, right: it.x + it.w, size: it.size, asc: it.asc, desc: it.desc,
            family: it.family, font: it.font, real: it.real, parts: [], closed: false };
      groups.push(g);
    }
    const gap = it.x - g.right;
    if (g.parts.length && gap > it.size * 0.18 && !/\s$/.test(g.parts[g.parts.length - 1]) && !/^\s/.test(it.str)) {
      g.parts.push(' ');
    }
    g.parts.push(it.str);
    g.right = Math.max(g.right, it.x + it.w);
    g.size = Math.max(g.size, it.size);
    if (it.eol) g.closed = true;
  }

  for (const grp of groups) {
    const text = grp.parts.join('').replace(/\s+$/, '');
    if (!text) continue;
    const width = Math.max(grp.right - grp.x, text.length * grp.size * 0.3);
    const box = sampleColors(P, grp.x, grp.y - grp.asc * grp.size, width, (grp.asc + grp.desc) * grp.size);
    const fname = grp.real || '';
    const vw = P.viewport.width;
    const centered = Math.abs((grp.x + width / 2) - vw / 2) < vw * 0.02 && width < vw * 0.9;
    addLine(P, {
      x: grp.x, baseline: grp.y, size: grp.size, width,
      asc: grp.asc, desc: grp.desc,
      original: text, text,
      color: box.fg, bg: box.bg,
      bold: /bold|black|heavy|semib|demib|extrab/i.test(fname),
      italic: /italic|oblique/i.test(fname),
      family: grp.family, real: fname, css: prettyFont(fname),
      align: centered ? 'center' : 'left', isNew: false,
    });
  }
  if (!groups.length && P.num === 1) {
    status('Esta página no tiene texto seleccionable (parece un PDF escaneado). Puedes agregar texto nuevo con "+ Texto".', 'err');
  }
}

/* ----------------------------------- muestreo de color de texto y de fondo */
function sampleColors(P, x, y, w, h) {
  const s = RENDER_SCALE;
  const X = clamp(Math.floor(x * s) - 1, 0, P.canvas.width - 1);
  const Y = clamp(Math.floor(y * s) - 1, 0, P.canvas.height - 1);
  const W = clamp(Math.ceil(w * s) + 2, 1, P.canvas.width - X);
  const H = clamp(Math.ceil(h * s) + 2, 1, P.canvas.height - Y);
  const def = { fg: [17, 17, 17], bg: [255, 255, 255] };
  try {
    const d = P.ctx.getImageData(X, Y, W, H).data;
    const hist = new Map();
    for (let i = 0; i < d.length; i += 4) {
      const a = d[i + 3];
      const r = a < 20 ? 255 : d[i], g = a < 20 ? 255 : d[i + 1], b = a < 20 ? 255 : d[i + 2];
      const k = (r >> 4 << 8) | (g >> 4 << 4) | (b >> 4);
      let e = hist.get(k);
      if (!e) hist.set(k, (e = { n: 0, r: 0, g: 0, b: 0 }));
      e.n++; e.r += r; e.g += g; e.b += b;
    }
    const list = [...hist.values()].sort((a, b) => b.n - a.n).map((e) => ({ n: e.n, c: [e.r / e.n, e.g / e.n, e.b / e.n] }));
    if (!list.length) return def;
    const bg = list[0].c;
    const far = list.find((e) => Math.abs(e.c[0] - bg[0]) + Math.abs(e.c[1] - bg[1]) + Math.abs(e.c[2] - bg[2]) > 110);
    return { bg, fg: far ? far.c : [17, 17, 17] };
  } catch (_) { return def; }
}

/* ------------------------------------------------------- líneas editables */
function kindOf(L) {
  const s = ((L.real || '') || (L.family || '')).toLowerCase();
  if (/mono|courier|consol|menlo/.test(s)) return 'mono';
  if (/sans/.test(s)) return 'sans';
  if (/serif|times|georgia|garamond|roman|book|minion|caslon|baskerville|playfair|merriweather|lora|cambria|palatino|didot|bodoni/.test(s)) return 'serif';
  return 'sans';
}
function cssFamily(L) {
  const k = kindOf(L);
  const fallback = k === 'mono' ? 'ui-monospace, "Courier New", monospace'
    : k === 'serif' ? '"Times New Roman", Times, serif'
    : 'Helvetica, Arial, sans-serif';
  return L.css ? `"${L.css}", ${fallback}` : fallback;
}

function addLine(P, data) {
  const line = Object.assign({ id: 'l' + (++state.seq), page: P.num, edited: false }, data);
  const node = document.createElement('div');
  node.className = 'tl';
  node.contentEditable = 'true';
  node.spellcheck = false;
  node.dataset.id = line.id;
  node.textContent = line.text;
  line.el = node;
  P.lines.push(line);
  P.layer.append(node);
  placeLine(line);
  node.addEventListener('focus', () => selectLine(line));
  node.addEventListener('blur', () => { if (state.active === line) setTimeout(hideIfBlur, 120); });
  node.addEventListener('input', () => {
    line.text = node.innerText.replace(/\n/g, ' ');
    line.edited = line.isNew || line.text !== line.original;
    paintLine(line); updateCount();
  });
  node.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); node.blur(); }
    if (e.key === 'Escape') { e.preventDefault(); node.blur(); }
  });
  return line;
}

function placeLine(L) {
  const P = state.pages[L.page];
  const vw = P.viewport.width, vh = P.viewport.height;
  const top = L.baseline - L.asc * L.size;
  const h = (L.asc + L.desc) * L.size;
  const st = L.el.style;
  st.left = (L.x / vw * 100) + '%';
  st.top = (top / vh * 100) + '%';
  st.fontSize = `calc(var(--s) * ${L.size}px)`;
  st.lineHeight = `calc(var(--s) * ${h}px)`;
  st.minWidth = L.isNew ? '10px' : `calc(var(--s) * ${L.width}px)`;
  st.fontFamily = cssFamily(L);
  paintLine(L);
}

function paintLine(L) {
  const st = L.el.style;
  st.fontWeight = L.bold ? '700' : '400';
  st.fontStyle = L.italic ? 'italic' : 'normal';
  st.textAlign = L.align;
  if (L.edited) {
    L.el.classList.add('edited');
    st.color = toHex(L.color);
    st.background = L.isNew ? 'transparent' : toHex(L.bg);
  } else {
    L.el.classList.remove('edited');
    st.color = 'transparent';
    st.background = 'transparent';
  }
}

function eachLine(fn) {
  for (const P of state.pages) if (P) for (const L of P.lines) fn(L, P);
}
function updateCount() {
  let n = 0; eachLine((L) => { if (L.edited) n++; });
  el.btnSave.textContent = n ? `Descargar (${n})` : 'Descargar';
}

/* ------------------------------------------------------------- toolbar */
function selectLine(L) {
  state.active = L;
  el.toolbar.hidden = false;
  const r = L.el.getBoundingClientRect();
  const tb = el.toolbar.getBoundingClientRect();
  let top = window.scrollY + r.top - tb.height - 10;
  if (top < window.scrollY + 70) top = window.scrollY + r.bottom + 10;
  el.toolbar.style.top = top + 'px';
  el.toolbar.style.left = clamp(window.scrollX + r.left, 8, window.innerWidth - (tb.width || 380) - 8) + 'px';
  el.tbSize.value = Math.round(L.size * 10) / 10;
  el.tbColor.value = toHex(L.color);
  el.tbBold.classList.toggle('on', !!L.bold);
  el.tbItalic.classList.toggle('on', !!L.italic);
  document.querySelectorAll('[data-align]').forEach((b) => b.classList.toggle('on', b.dataset.align === L.align));
}
function hideToolbar() { el.toolbar.hidden = true; state.active = null; }
function hideIfBlur() {
  if (!el.toolbar.contains(document.activeElement) && !document.activeElement?.classList?.contains('tl')) hideToolbar();
}
function touch(L) { L.edited = true; paintLine(L); updateCount(); }

el.tbSize.addEventListener('input', () => {
  const L = state.active; if (!L) return;
  const v = parseFloat(el.tbSize.value); if (!(v > 0)) return;
  L.size = v; placeLine(L); touch(L); L.el.focus();
});
el.tbColor.addEventListener('input', () => {
  const L = state.active; if (!L) return;
  L.color = hexToRgb(el.tbColor.value); touch(L);
});
el.tbBold.addEventListener('click', () => { const L = state.active; if (!L) return; L.bold = !L.bold; el.tbBold.classList.toggle('on', L.bold); touch(L); });
el.tbItalic.addEventListener('click', () => { const L = state.active; if (!L) return; L.italic = !L.italic; el.tbItalic.classList.toggle('on', L.italic); touch(L); });
document.querySelectorAll('[data-align]').forEach((b) => b.addEventListener('click', () => {
  const L = state.active; if (!L) return;
  L.align = b.dataset.align;
  document.querySelectorAll('[data-align]').forEach((x) => x.classList.toggle('on', x === b));
  touch(L);
}));
el.tbRevert.addEventListener('click', () => {
  const L = state.active; if (!L) return;
  if (L.isNew) { L.el.remove(); const P = state.pages[L.page]; P.lines = P.lines.filter((x) => x !== L); hideToolbar(); updateCount(); return; }
  L.text = L.original; L.el.textContent = L.original; L.edited = false;
  paintLine(L); updateCount(); hideToolbar();
});

/* ------------------------------------------------------- agregar texto */
function onLayerClick(ev, n) {
  if (!state.addMode) return;
  const P = state.pages[n];
  const r = P.layer.getBoundingClientRect();
  const scale = r.width / P.viewport.width;
  const x = (ev.clientX - r.left) / scale;
  const y = (ev.clientY - r.top) / scale;
  const size = 12;
  const L = addLine(P, {
    x, baseline: y + size * 0.78, size, width: 40, asc: 0.78, desc: 0.22,
    original: '', text: 'Texto nuevo', color: [17, 17, 17], bg: [255, 255, 255],
    bold: false, italic: false, family: 'sans-serif', real: '', css: '', align: 'left', isNew: true,
  });
  L.edited = true;
  L.el.classList.add('new');
  L.el.textContent = 'Texto nuevo';
  paintLine(L); updateCount();
  setAddMode(false);
  L.el.focus();
  document.getSelection().selectAllChildren(L.el);
}
function setAddMode(on) {
  state.addMode = on;
  el.btnAdd.classList.toggle('on', on);
  document.querySelectorAll('.layer').forEach((l) => l.classList.toggle('adding', on));
  status(on ? 'Haz clic en el documento donde quieras colocar el texto.' : '');
}

/* --------------------------------------------------------------- export */
const StdFonts = () => PDFLib.StandardFonts;
function fontKey(L) {
  const k = kindOf(L);
  const mono = k === 'mono', serif = k === 'serif';
  const S = StdFonts();
  if (mono) return L.bold && L.italic ? S.CourierBoldOblique : L.bold ? S.CourierBold : L.italic ? S.CourierOblique : S.Courier;
  if (serif) return L.bold && L.italic ? S.TimesRomanBoldItalic : L.bold ? S.TimesRomanBold : L.italic ? S.TimesRomanItalic : S.TimesRoman;
  return L.bold && L.italic ? S.HelveticaBoldOblique : L.bold ? S.HelveticaBold : L.italic ? S.HelveticaOblique : S.Helvetica;
}
const charCache = new Map();
function safeText(font, text, key) {
  let out = '', dropped = false;
  for (const ch of text) {
    const ck = key + ch;
    let ok = charCache.get(ck);
    if (ok === undefined) {
      try { font.widthOfTextAtSize(ch, 10); ok = true; } catch (_) { ok = false; }
      charCache.set(ck, ok);
    }
    if (ok) out += ch;
    else { out += '?'; dropped = true; }
  }
  return { text: out, dropped };
}

async function exportPdf() {
  const edits = [];
  eachLine((L) => { if (L.edited) edits.push(L); });
  if (!edits.length) return status('Todavía no hay cambios que guardar.', 'err');
  status('Generando PDF…');
  try {
    const { PDFDocument, rgb, degrees } = PDFLib;
    const doc = await PDFDocument.load(state.saveBytes.slice(0), { ignoreEncryption: true });
    const pages = doc.getPages();
    const fonts = new Map();
    let dropped = false, leftover = 0;

    // agrupar por página
    const byPage = new Map();
    for (const L of edits) {
      if (!byPage.has(L.page)) byPage.set(L.page, []);
      byPage.get(L.page).push(L);
    }

    for (const [pageNum, lines] of byPage) {
      const P = state.pages[pageNum];
      const page = pages[pageNum - 1];
      if (!page) continue;
      const vp = P.viewport;
      const cleaned = new Set();

      // 1) borrar del código del PDF el texto original de las líneas tocadas
      const targets = lines.filter((L) => !L.isNew);
      if (targets.length && !doc.isEncrypted) {
        const boxes = targets.map((L) => {
          const pad = Math.max(0.6, L.size * 0.06);
          const corners = [
            vp.convertToPdfPoint(L.x - pad, L.baseline - L.asc * L.size),
            vp.convertToPdfPoint(L.x + L.width + pad, L.baseline - L.asc * L.size),
            vp.convertToPdfPoint(L.x - pad, L.baseline + L.desc * L.size),
            vp.convertToPdfPoint(L.x + L.width + pad, L.baseline + L.desc * L.size),
          ];
          const xs = corners.map((c) => c[0]), ys = corners.map((c) => c[1]);
          return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
        });
        let hits = [];
        try { hits = stripTextInBoxes(doc, page, boxes) || []; }
        catch (err) { console.warn('strip:', err); }
        for (let i = 0; i < targets.length; i++) {
          if (hits[i]) cleaned.add(targets[i]); else leftover++;
        }
      } else if (targets.length) {
        leftover += targets.length;
      }

      // 2) tapar el área y escribir el texto nuevo
      for (const L of lines) {
        const key = fontKey(L);
        if (!fonts.has(key)) fonts.set(key, await doc.embedFont(key));
        const font = fonts.get(key);
        const clean = safeText(font, L.text, key);
        if (clean.dropped) dropped = true;

        const a0 = vp.convertToPdfPoint(0, 0), a1 = vp.convertToPdfPoint(1, 0);
        const ang = Math.atan2(a1[1] - a0[1], a1[0] - a0[0]) * 180 / Math.PI;

        if (!L.isNew && !cleaned.has(L)) {
          const padX = Math.max(0.6, L.size * 0.06);
          const rectTop = L.baseline - L.asc * L.size - L.size * 0.06;
          const rectH = (L.asc + L.desc) * L.size + L.size * 0.12;
          const bl = vp.convertToPdfPoint(L.x - padX, rectTop + rectH);
          page.drawRectangle({
            x: bl[0], y: bl[1],
            width: L.width + padX * 2, height: rectH,
            rotate: degrees(ang),
            color: rgb(L.bg[0] / 255, L.bg[1] / 255, L.bg[2] / 255),
          });
        }

        const txt = clean.text;
        if (txt.trim()) {
          const tw = font.widthOfTextAtSize(txt, L.size);
          let x = L.x;
          if (L.align === 'center') x = L.x + (L.width - tw) / 2;
          else if (L.align === 'right') x = L.x + L.width - tw;
          const pt = vp.convertToPdfPoint(x, L.baseline);
          page.drawText(txt, {
            x: pt[0], y: pt[1], size: L.size, font,
            rotate: degrees(ang),
            color: rgb(L.color[0] / 255, L.color[1] / 255, L.color[2] / 255),
          });
        }
      }
    }

    const bytes = await doc.save();
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url; a.download = state.docs.length > 1 ? `${state.name}.pdf` : `${state.name}-editado.pdf`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    const notes = [];
    if (dropped) notes.push('algunos caracteres no soportados por la fuente se guardaron como "?"');
    if (leftover) notes.push(`en ${leftover} línea(s) el texto viejo quedó oculto pero no se pudo borrar del código`);
    status(notes.length
      ? `PDF descargado con ${edits.length} cambio(s). Ojo: ${notes.join('; ')}.`
      : `PDF descargado con ${edits.length} cambio${edits.length > 1 ? 's' : ''}.`, notes.length ? 'err' : '');
    setTimeout(() => status(''), 9000);
  } catch (err) {
    console.error(err);
    status('No se pudo generar el PDF: ' + err.message, 'err');
  }
}

/* ---------------------------------------------------------------- eventos */
el.btnOpen.addEventListener('click', () => el.file.click());
el.btnPick.addEventListener('click', () => el.file.click());
el.file.addEventListener('change', (e) => { addFiles(e.target.files); e.target.value = ''; });
el.btnMore.addEventListener('click', () => el.file.click());
el.btnAdd.addEventListener('click', () => setAddMode(!state.addMode));
el.btnSave.addEventListener('click', exportPdf);
el.btnReset.addEventListener('click', () => {
  hideToolbar();
  for (const P of state.pages) {
    if (!P) continue;
    P.lines = P.lines.filter((L) => {
      if (L.isNew) { L.el.remove(); return false; }
      L.text = L.original; L.el.textContent = L.original; L.edited = false; paintLine(L);
      return true;
    });
  }
  updateCount();
  status('Se restauró el texto original.');
  setTimeout(() => status(''), 3000);
});

['dragenter', 'dragover'].forEach((t) => document.addEventListener(t, (e) => {
  e.preventDefault(); if (!el.drop.hidden) el.drop.classList.add('over');
}));
['dragleave', 'drop'].forEach((t) => document.addEventListener(t, (e) => {
  e.preventDefault(); el.drop.classList.remove('over');
}));
document.addEventListener('drop', (e) => { if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && state.addMode) setAddMode(false);
  if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); if (!el.btnSave.disabled) exportPdf(); }
});
window.addEventListener('scroll', () => { if (state.active) selectLine(state.active); }, { passive: true });
