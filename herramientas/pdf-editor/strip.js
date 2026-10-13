/* Elimina del código del PDF los operadores de texto que caen dentro de las
   zonas editadas, para que el contenido viejo no siga siendo extraíble.
   Trabaja sobre el content stream de la página y sobre Form XObjects. */

const L = () => window.PDFLib;

/* ----------------------------------------------------------- tokenizer */
const WS = new Uint8Array(256), DELIM = new Uint8Array(256);
[0, 9, 10, 12, 13, 32].forEach((c) => (WS[c] = 1));
[0x28, 0x29, 0x3c, 0x3e, 0x5b, 0x5d, 0x7b, 0x7d, 0x2f, 0x25].forEach((c) => (DELIM[c] = 1));

function readLiteralString(b, i) {          // i apunta a '('
  const out = [];
  let depth = 1; i++;
  while (i < b.length) {
    let c = b[i];
    if (c === 0x5c) {                        // backslash
      i++;
      const n = b[i];
      if (n === 0x6e) out.push(10);
      else if (n === 0x72) out.push(13);
      else if (n === 0x74) out.push(9);
      else if (n === 0x62) out.push(8);
      else if (n === 0x66) out.push(12);
      else if (n >= 0x30 && n <= 0x37) {      // octal
        let v = 0, k = 0;
        while (k < 3 && b[i] >= 0x30 && b[i] <= 0x37) { v = v * 8 + (b[i] - 0x30); i++; k++; }
        out.push(v & 255); continue;
      } else if (n === 10) { i++; continue; }
      else if (n === 13) { i++; if (b[i] === 10) i++; continue; }
      else out.push(n);
      i++; continue;
    }
    if (c === 0x28) depth++;
    if (c === 0x29) { depth--; if (!depth) { i++; break; } }
    out.push(c); i++;
  }
  return { bytes: Uint8Array.from(out), next: i };
}
function readHexString(b, i) {               // i apunta a '<'
  const out = []; i++;
  let hi = -1;
  while (i < b.length && b[i] !== 0x3e) {
    const c = b[i];
    let v = -1;
    if (c >= 48 && c <= 57) v = c - 48;
    else if (c >= 65 && c <= 70) v = c - 55;
    else if (c >= 97 && c <= 102) v = c - 87;
    if (v >= 0) { if (hi < 0) hi = v; else { out.push(hi * 16 + v); hi = -1; } }
    i++;
  }
  if (hi >= 0) out.push(hi * 16);
  return { bytes: Uint8Array.from(out), next: i + 1 };
}
function skipInlineImage(b, i) {             // i después de 'BI'
  while (i < b.length - 1) {
    if (b[i] === 0x49 && b[i + 1] === 0x44 && (i === 0 || WS[b[i - 1]] || DELIM[b[i - 1]])) { i += 2; break; }
    i++;
  }
  i++;                                        // un byte de whitespace tras ID
  while (i < b.length - 1) {
    if (b[i] === 0x45 && b[i + 1] === 0x49 && WS[b[i - 1]] && (i + 2 >= b.length || WS[b[i + 2]] || DELIM[b[i + 2]])) return i + 2;
    i++;
  }
  return b.length;
}

/* -------------------------------------------------------------- álgebra */
const mul = (m, n) => [
  m[0] * n[0] + m[1] * n[2], m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2], m[2] * n[1] + m[3] * n[3],
  m[4] * n[0] + m[5] * n[2] + n[4], m[4] * n[1] + m[5] * n[3] + n[5],
];
const ID = [1, 0, 0, 1, 0, 0];

/* ------------------------------------------------- anchos de las fuentes */
function buildFont(ctx, dict) {
  const { PDFName } = L();
  const info = { type0: false, widths: new Map(), def: 500 };
  if (!dict) return info;
  try {
    const sub = dict.lookup(PDFName.of('Subtype'));
    const subName = sub && sub.asString ? sub.asString() : '';
    if (subName === '/Type0') {
      info.type0 = true;
      const desc = dict.lookup(PDFName.of('DescendantFonts'));
      const d0 = desc && desc.lookup ? desc.lookup(0) : null;
      if (d0) {
        const dw = d0.lookup(PDFName.of('DW'));
        info.def = dw && typeof dw.asNumber === 'function' ? dw.asNumber() : 1000;
        const W = d0.lookup(PDFName.of('W'));
        if (W && W.size) {
          let i = 0;
          while (i < W.size()) {
            const a = W.lookup(i);
            const b = W.lookup(i + 1);
            if (b && b.size) {                       // c [w1 w2 ...]
              const start = a.asNumber();
              for (let k = 0; k < b.size(); k++) info.widths.set(start + k, b.lookup(k).asNumber());
              i += 2;
            } else if (b) {                          // cFirst cLast w
              const c = W.lookup(i + 2);
              const s = a.asNumber(), e = b.asNumber(), w = c ? c.asNumber() : info.def;
              for (let k = s; k <= e && k - s < 65536; k++) info.widths.set(k, w);
              i += 3;
            } else break;
          }
        }
      }
      return info;
    }
    const fc = dict.lookup(PDFName.of('FirstChar'));
    const ws = dict.lookup(PDFName.of('Widths'));
    if (ws && ws.size && fc) {
      const first = fc.asNumber();
      for (let k = 0; k < ws.size(); k++) {
        const w = ws.lookup(k);
        if (w && typeof w.asNumber === 'function') info.widths.set(first + k, w.asNumber());
      }
    }
    const fd = dict.lookup(PDFName.of('FontDescriptor'));
    const mw = fd && fd.lookup ? fd.lookup(PDFName.of('MissingWidth')) : null;
    if (mw && typeof mw.asNumber === 'function') info.def = mw.asNumber();
    else if (info.widths.size) {
      let sum = 0; for (const v of info.widths.values()) sum += v;
      info.def = sum / info.widths.size || 500;
    }
  } catch (_) {}
  return info;
}
const widthOf = (f, code) => (f.widths.has(code) ? f.widths.get(code) : f.def);

/* ------------------------------------------------------------ el parser */
function processStream(ctx, bytes, resources, baseCtm, boxes, hits, depth, doc) {
  const { PDFName } = L();
  const cuts = [];
  const fontCache = new Map();
  const lookupRes = (cat, name) => {
    try {
      const d = resources && resources.lookup ? resources.lookup(PDFName.of(cat)) : null;
      return d && d.lookup ? d.lookup(PDFName.of(name.replace(/^\//, ''))) : null;
    } catch (_) { return null; }
  };
  const getFont = (name) => {
    if (fontCache.has(name)) return fontCache.get(name);
    const f = buildFont(ctx, lookupRes('Font', name));
    fontCache.set(name, f);
    return f;
  };

  let gs = { ctm: baseCtm.slice(), fs: 0, font: null, Tc: 0, Tw: 0, Th: 1, Ts: 0, TL: 0 };
  const stack = [];
  let tm = ID.slice(), tlm = ID.slice();
  let operands = [], opStart = -1;
  const formEdits = [];

  const push = (v, start) => { if (opStart < 0) opStart = start; operands.push(v); };
  const num = (i) => (typeof operands[i] === 'number' ? operands[i] : 0);

  const showAdvance = (parts) => {             // parts: [{bytes}|number]
    const f = gs.font || { type0: false, widths: new Map(), def: 500 };
    let tx = 0;
    for (const p of parts) {
      if (typeof p === 'number') { tx -= (p / 1000) * gs.fs * gs.Th; continue; }
      const b = p;
      if (f.type0) {
        for (let i = 0; i + 1 < b.length; i += 2) {
          tx += ((widthOf(f, (b[i] << 8) | b[i + 1]) / 1000) * gs.fs + gs.Tc) * gs.Th;
        }
      } else {
        for (let i = 0; i < b.length; i++) {
          tx += ((widthOf(f, b[i]) / 1000) * gs.fs + gs.Tc + (b[i] === 32 ? gs.Tw : 0)) * gs.Th;
        }
      }
    }
    return tx;
  };
  const inBox = () => {
    const trm = mul(mul([gs.fs * gs.Th, 0, 0, gs.fs, 0, gs.Ts], tm), gs.ctm);
    const x = trm[4], y = trm[5];
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (x >= b.x0 - 1.5 && x <= b.x1 + 1.5 && y >= b.y0 - 0.5 && y <= b.y1 + 0.5) return i;
    }
    return -1;
  };

  let i = 0;
  const b = bytes;
  while (i < b.length) {
    const c = b[i];
    if (WS[c]) { i++; continue; }
    if (c === 0x25) { while (i < b.length && b[i] !== 10 && b[i] !== 13) i++; continue; }   // comentario
    if (c === 0x28) { const r = readLiteralString(b, i); push(r.bytes, i); i = r.next; continue; }
    if (c === 0x3c && b[i + 1] !== 0x3c) { const r = readHexString(b, i); push(r.bytes, i); i = r.next; continue; }
    if (c === 0x3c && b[i + 1] === 0x3c) {                                                   // dict: se salta
      let d = 0, s = i;
      while (i < b.length) {
        if (b[i] === 0x3c && b[i + 1] === 0x3c) { d++; i += 2; continue; }
        if (b[i] === 0x3e && b[i + 1] === 0x3e) { d--; i += 2; if (!d) break; continue; }
        if (b[i] === 0x28) { i = readLiteralString(b, i).next; continue; }
        i++;
      }
      push({ dict: true }, s); continue;
    }
    if (c === 0x5b) {                                                                        // array
      const s = i; i++;
      const arr = [];
      while (i < b.length && b[i] !== 0x5d) {
        if (WS[b[i]]) { i++; continue; }
        if (b[i] === 0x28) { const r = readLiteralString(b, i); arr.push(r.bytes); i = r.next; continue; }
        if (b[i] === 0x3c) { const r = readHexString(b, i); arr.push(r.bytes); i = r.next; continue; }
        let j = i;
        while (j < b.length && !WS[b[j]] && !DELIM[b[j]]) j++;
        const t = String.fromCharCode(...b.subarray(i, j));
        const n = parseFloat(t);
        if (!isNaN(n)) arr.push(n);
        i = j > i ? j : i + 1;
      }
      i++; push(arr, s); continue;
    }
    if (c === 0x2f) {                                                                        // nombre
      const s = i; i++;
      while (i < b.length && !WS[b[i]] && !DELIM[b[i]]) i++;
      push('/' + String.fromCharCode(...b.subarray(s + 1, i)), s); continue;
    }
    if (c === 0x5d || c === 0x7b || c === 0x7d || c === 0x29 || c === 0x3e) { i++; continue; }

    // número u operador
    const s = i;
    while (i < b.length && !WS[b[i]] && !DELIM[b[i]]) i++;
    const tok = String.fromCharCode(...b.subarray(s, i));
    if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(tok)) { push(parseFloat(tok), s); continue; }

    const opEnd = i;
    const op = tok;
    const start = opStart < 0 ? s : opStart;

    switch (op) {
      case 'q': stack.push({ ...gs, ctm: gs.ctm.slice() }); break;
      case 'Q': if (stack.length) gs = stack.pop(); break;
      case 'cm': gs.ctm = mul([num(0), num(1), num(2), num(3), num(4), num(5)], gs.ctm); break;
      case 'BT': tm = ID.slice(); tlm = ID.slice(); break;
      case 'ET': break;
      case 'Tf': gs.fs = num(1); gs.font = typeof operands[0] === 'string' ? getFont(operands[0]) : null; break;
      case 'Tc': gs.Tc = num(0); break;
      case 'Tw': gs.Tw = num(0); break;
      case 'Tz': gs.Th = num(0) / 100; break;
      case 'TL': gs.TL = num(0); break;
      case 'Ts': gs.Ts = num(0); break;
      case 'Td': tlm = mul([1, 0, 0, 1, num(0), num(1)], tlm); tm = tlm.slice(); break;
      case 'TD': gs.TL = -num(1); tlm = mul([1, 0, 0, 1, num(0), num(1)], tlm); tm = tlm.slice(); break;
      case 'Tm': tlm = [num(0), num(1), num(2), num(3), num(4), num(5)]; tm = tlm.slice(); break;
      case 'T*': tlm = mul([1, 0, 0, 1, 0, -gs.TL], tlm); tm = tlm.slice(); break;
      case 'Tj': case 'TJ': case "'": case '"': {
        if (op === "'" ) { tlm = mul([1, 0, 0, 1, 0, -gs.TL], tlm); tm = tlm.slice(); }
        if (op === '"') {
          gs.Tw = num(0); gs.Tc = num(1);
          tlm = mul([1, 0, 0, 1, 0, -gs.TL], tlm); tm = tlm.slice();
        }
        const last = operands[operands.length - 1];
        const parts = op === 'TJ' ? (Array.isArray(last) ? last : []) : (last instanceof Uint8Array ? [last] : []);
        const hit = inBox();
        if (hit >= 0) { cuts.push([start, opEnd]); hits[hit] = (hits[hit] || 0) + 1; }
        tm = mul([1, 0, 0, 1, showAdvance(parts), 0], tm);
        break;
      }
      case 'Do': {
        if (depth < 3 && typeof operands[0] === 'string') {
          const xo = lookupRes('XObject', operands[0]);
          formEdits.push({ name: operands[0], xo, ctm: gs.ctm.slice() });
        }
        break;
      }
      case 'BI': i = skipInlineImage(b, i); break;
      default: break;
    }
    operands = []; opStart = -1;
  }

  return { cuts, formEdits };
}

function decodeStream(stream) {
  const { PDFRawStream, decodePDFRawStream } = L();
  if (stream instanceof PDFRawStream) return decodePDFRawStream(stream).decode();
  if (typeof stream.getContents === 'function') return stream.getContents();
  return new Uint8Array(0);
}
function applyCuts(bytes, cuts) {
  if (!cuts.length) return bytes;
  cuts.sort((a, b) => a[0] - b[0]);
  const out = new Uint8Array(bytes.length);
  let n = 0, pos = 0;
  for (const [s, e] of cuts) {
    if (s < pos) continue;
    out.set(bytes.subarray(pos, s), n); n += s - pos;
    out[n++] = 32;
    pos = e;
  }
  out.set(bytes.subarray(pos), n); n += bytes.length - pos;
  return out.subarray(0, n);
}

/* ------------------------------------------------------------- API */
export function stripTextInBoxes(doc, page, boxes) {
  const { PDFName, PDFArray } = L();
  const hits = [];
  if (!boxes.length) return hits;
  const ctx = doc.context;
  const contents = page.node.Contents();
  if (!contents) return hits;

  let bytes;
  const isArray = contents instanceof PDFArray;
  if (isArray) {
    const chunks = [];
    for (let i = 0; i < contents.size(); i++) {
      const s = contents.lookup(i);
      chunks.push(decodeStream(s), Uint8Array.from([10]));
    }
    let len = 0; chunks.forEach((c) => (len += c.length));
    bytes = new Uint8Array(len);
    let o = 0; chunks.forEach((c) => { bytes.set(c, o); o += c.length; });
  } else {
    bytes = decodeStream(contents);
  }

  const resources = page.node.Resources();
  const { cuts, formEdits } = processStream(ctx, bytes, resources, [1, 0, 0, 1, 0, 0], boxes, hits, 0, doc);

  // Form XObjects (un nivel de anidación, clonando para no afectar otras páginas)
  const replacements = [];
  for (const fe of formEdits) {
    try {
      const xo = fe.xo;
      if (!xo || !xo.dict) continue;
      const sub = xo.dict.lookup(PDFName.of('Subtype'));
      if (!sub || sub.asString() !== '/Form') continue;
      const mtxArr = xo.dict.lookup(PDFName.of('Matrix'));
      let mtx = [1, 0, 0, 1, 0, 0];
      if (mtxArr && mtxArr.size && mtxArr.size() === 6) mtx = [0, 1, 2, 3, 4, 5].map((k) => mtxArr.lookup(k).asNumber());
      const fres = xo.dict.lookup(PDFName.of('Resources')) || resources;
      const fbytes = decodeStream(xo);
      const r = processStream(ctx, fbytes, fres, mul(mtx, fe.ctm), boxes, hits, 1, doc);
      if (r.cuts.length) {
        const newBytes = applyCuts(fbytes, r.cuts);
        const dict = xo.dict.clone(ctx);
        dict.delete(PDFName.of('Filter'));
        dict.delete(PDFName.of('DecodeParms'));
        dict.set(PDFName.of('Length'), ctx.obj(newBytes.length));
        dict.delete(PDFName.of('DL'));
        const ns = L().PDFRawStream.of(dict, newBytes);
        replacements.push({ name: fe.name, ref: ctx.register(ns) });
      }
    } catch (err) { console.warn('form xobject:', err); }
  }
  if (replacements.length && resources) {
    try {
      const xdict = resources.lookup(PDFName.of('XObject'));
      if (xdict) {
        const clone = xdict.clone(ctx);
        for (const rp of replacements) clone.set(PDFName.of(rp.name.replace(/^\//, '')), rp.ref);
        const resClone = resources.clone(ctx);
        resClone.set(PDFName.of('XObject'), clone);
        page.node.set(PDFName.of('Resources'), resClone);
      }
    } catch (err) { console.warn('resources clone:', err); }
  }

  if (cuts.length) {
    const newBytes = applyCuts(bytes, cuts);
    const dict = ctx.obj({ Length: newBytes.length });
    const stream = L().PDFRawStream.of(dict, newBytes);
    const ref = ctx.register(stream);
    page.node.set(PDFName.of('Contents'), ref);
  }
  return hits;
}
