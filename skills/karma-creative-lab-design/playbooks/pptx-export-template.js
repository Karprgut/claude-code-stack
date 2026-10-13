/**
 * pptx-export-template.js — Karma Creative Lab
 *
 * Template starter para exportar un deck HTML a PPTX editable nativo.
 *
 * Cómo usar:
 *  1. Copia este archivo a tu proyecto como `pptx-export.js`
 *  2. Cárgalo desde tu index.html: <script src="pptx-export.js"></script>
 *  3. Asegúrate de tener en el index.html:
 *       - Un botón con id="export-pptx-btn"
 *       - Un overlay con id="export-overlay" + #o-current, #o-total, #o-name, #o-bar-fill, #o-pct
 *       - Slides como <section class="slide"> dentro de <deck-stage>
 *  4. Actualiza la paleta `C` con los colores de la marca del proyecto
 *  5. Escribe los renderers (r[Layout]) por cada tipo de slide
 *  6. Conéctalos en el dispatcher renderSlide()
 *
 * Documentación completa: pptx-from-html.md (en este mismo directorio)
 */

(() => {
  // ============================================================
  // 1. CONSTANTES — ajusta según el design system del proyecto
  // ============================================================
  const CW = 13.333, CH = 7.5;                  // PPTX LAYOUT_WIDE
  const px = n => +(n * CW / 1920).toFixed(3);
  const py = n => +(n * CH / 1080).toFixed(3);
  const FONT = 'Poppins';                       // ← cambia por la fuente de marca

  // Paleta — hex SIN '#'. Reemplaza por la del proyecto.
  const C = {
    navy: '0C2B66', lavender: 'AE8DF5', lavender100: 'E3E3FF',
    blue: '4A7FF7', orange: 'F79646', tealBright: '00C4CC',
    green: '4FB849', red: 'E1261C',
    bg: 'F4F5F7', surface: 'FFFFFF', line: 'E5E7ED',
    ink: '0C2B66', ink2: '2D3A5C', ink3: '6B7494',
  };
  const ACCENT_S = { s1: C.blue, s2: C.lavender, s3: C.orange, s4: C.tealBright };

  // ============================================================
  // 2. REFERENCIAS UI — el botón y el overlay vienen del HTML
  // ============================================================
  const btn = document.getElementById('export-pptx-btn');
  const overlay = document.getElementById('export-overlay');
  const elCurrent = document.getElementById('o-current');
  const elTotal = document.getElementById('o-total');
  const elName = document.getElementById('o-name');
  const elBar = document.getElementById('o-bar-fill');
  const elPct = document.getElementById('o-pct');
  const elTitle = overlay && overlay.querySelector('.o-title');

  // ============================================================
  // 3. UTILIDADES
  // ============================================================
  const txt = el => (el && el.textContent || '').replace(/\s+/g, ' ').trim();
  const txtKeep = el => (el && el.textContent || '').trim();
  const firstClass = (el, list) => list.find(c => el.classList.contains(c));

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = res;
      s.onerror = () => rej(new Error('Falló carga de ' + src));
      document.head.appendChild(s);
    });
  }

  function showOverlay(total) {
    overlay.setAttribute('data-visible', '');
    elTotal.textContent = total; elCurrent.textContent = '0';
    elBar.style.width = '0%'; elPct.textContent = '0%';
  }
  function hideOverlay() { overlay.removeAttribute('data-visible'); }
  function progress(i, total, name) {
    elCurrent.textContent = i; elName.textContent = name;
    const p = Math.round((i / total) * 100);
    elBar.style.width = p + '%'; elPct.textContent = p + '%';
  }

  // ============================================================
  // 4. PRELOAD DE LOGO — necesario para file:// y CORS
  // ============================================================
  let LOGO_DATA = null;
  async function preloadLogo(path = 'assets/logo.png') {
    try {
      const res = await fetch(path);
      if (!res.ok) throw new Error('logo fetch ' + res.status);
      const blob = await res.blob();
      LOGO_DATA = await new Promise(r => {
        const fr = new FileReader();
        fr.onload = () => r(fr.result);
        fr.onerror = () => r(null);
        fr.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn('Logo no precargó:', e.message);
      LOGO_DATA = null;
    }
  }

  // ============================================================
  // 5. HELPERS DE DIBUJO
  // ============================================================

  // Línea horizontal delgada (NO uses addShape('line', {h:0}) — falla)
  function hline(slide, x, y, w, color) {
    const c = color || C.line;
    slide.addShape('rect', {
      x, y, w, h: 0.012,
      fill: { color: c }, line: { color: c, width: 0 }
    });
  }

  // Chrome común: corner-eyebrow + logo + page-num + footer-tag
  function chrome(slide, root, opts = {}) {
    const cornerEy = txt(root.querySelector('.corner-eyebrow'));
    const pageNum = txt(root.querySelector('.page-num'));
    const footerTag = txt(root.querySelector('.footer-tag'));

    if (cornerEy) slide.addText(cornerEy, {
      x: px(64), y: py(56), w: px(900), h: py(20),
      fontFace: FONT, fontSize: 9, bold: true,
      color: opts.darkBg ? 'FFFFFF' : C.navy, charSpacing: 4
    });

    if (!opts.skipLogo && LOGO_DATA) {
      try {
        slide.addImage({ data: LOGO_DATA, x: px(1620), y: py(50), w: px(240), h: py(48) });
      } catch (e) { console.warn('Logo skip:', e.message); }
    }

    if (pageNum) slide.addText(pageNum, {
      x: px(1700), y: py(1020), w: px(160), h: py(28),
      fontFace: FONT, fontSize: 9, bold: true,
      color: opts.darkBg ? 'A0A0A0' : C.ink3, align: 'right'
    });

    if (footerTag) slide.addText(footerTag, {
      x: px(64), y: py(1020), w: px(1500), h: py(28),
      fontFace: FONT, fontSize: 8.5,
      color: opts.darkBg ? 'A0A0A0' : C.ink3, charSpacing: 1
    });
  }

  // Header común: content-eyebrow + content-title + content-sub
  function contentHeader(slide, root) {
    const ey = txt(root.querySelector('.content-eyebrow'));
    const ti = txt(root.querySelector('.content-title'));
    const sub = txt(root.querySelector('.content-sub'));
    if (ey) slide.addText(ey, {
      x: px(120), y: py(130), w: px(1700), h: py(22),
      fontFace: FONT, fontSize: 10, bold: true, color: C.lavender, charSpacing: 4
    });
    if (ti) slide.addText(ti, {
      x: px(120), y: py(160), w: px(1700), h: py(110),
      fontFace: FONT, fontSize: 26, bold: true, color: C.navy, charSpacing: -1
    });
    if (sub) slide.addText(sub, {
      x: px(120), y: py(280), w: px(1700), h: py(60),
      fontFace: FONT, fontSize: 11.5, color: C.ink2
    });
  }

  // ============================================================
  // 6. RENDERERS — escribe uno por cada layout del deck
  // ============================================================

  // Ejemplo: slide de título (cover)
  function rTitle(slide, root) {
    slide.background = { fill: C.bg };
    chrome(slide, root);
    slide.addText(txt(root.querySelector('.title-eyebrow')), {
      x: 0, y: py(230), w: CW, h: py(32),
      fontFace: FONT, fontSize: 14, bold: true, color: C.navy,
      align: 'center', charSpacing: 7
    });
    const main = txtKeep(root.querySelector('.title-main')).replace(/\s*\n\s*/g, '\n');
    slide.addText(main, {
      x: 0, y: py(290), w: CW, h: py(290),
      fontFace: FONT, fontSize: 60, bold: true, color: C.navy,
      align: 'center', charSpacing: -2
    });
    slide.addShape('roundRect', {
      x: (CW - px(200)) / 2, y: py(600), w: px(200), h: py(8),
      fill: { color: C.lavender }, line: { color: C.lavender }, rectRadius: py(4)
    });
    slide.addText(txt(root.querySelector('.title-sub')), {
      x: px(360), y: py(640), w: CW - px(720), h: py(120),
      fontFace: FONT, fontSize: 13, color: C.ink2, align: 'center'
    });
  }

  // Ejemplo: section divider
  function rSection(slide, root) {
    slide.background = { fill: C.bg };
    chrome(slide, root);
    slide.addText(txt(root.querySelector('.sec-eyebrow')), {
      x: px(120), y: py(200), w: px(1500), h: py(30),
      fontFace: FONT, fontSize: 13, bold: true, color: C.lavender, charSpacing: 6
    });
    const t = txtKeep(root.querySelector('.sec-title')).replace(/\s*\n\s*/g, '\n');
    slide.addText(t, {
      x: px(120), y: py(258), w: px(1700), h: py(280),
      fontFace: FONT, fontSize: 56, bold: true, color: C.navy, charSpacing: -1.5
    });
    slide.addShape('roundRect', {
      x: px(120), y: py(860), w: px(240), h: py(8),
      fill: { color: C.lavender }, line: { color: C.lavender }, rectRadius: py(4)
    });
  }

  // Ejemplo: grid de hallazgos (3 o 4 columnas, soporta multi-row)
  function rFindings(slide, root, cols) {
    slide.background = { fill: C.bg };
    chrome(slide, root);
    contentHeader(slide, root);
    const findings = [...root.querySelectorAll('.findings > .finding')];
    const totalW = 1920 - 240;
    const gap = cols === 4 ? 24 : 32;
    const cardW = (totalW - gap * (cols - 1)) / cols;
    const rows = Math.ceil(findings.length / cols);
    const startY = 320;
    const availH = 1080 - startY - 140;
    const cardH = (availH - gap * (rows - 1)) / rows;

    findings.forEach((f, i) => {
      const r = Math.floor(i / cols), col = i % cols;
      const x = px(120 + (cardW + gap) * col);
      const y = py(startY + (cardH + gap) * r);
      const sCls = firstClass(f, ['s1', 's2', 's3', 's4']);
      const accent = sCls ? ACCENT_S[sCls] : C.lavender;

      slide.addShape('roundRect', {
        x, y, w: px(cardW), h: py(cardH),
        fill: { color: 'FFFFFF' }, line: { color: 'FFFFFF' }, rectRadius: py(20)
      });
      slide.addShape('rect', {
        x, y, w: px(cardW), h: py(8),
        fill: { color: accent }, line: { color: accent }
      });

      slide.addText(txt(f.querySelector('.f-num')), {
        x: x + px(28), y: y + py(32), w: px(cardW - 56), h: py(60),
        fontFace: FONT, fontSize: cols === 4 ? 28 : 32, bold: true, color: accent
      });
      slide.addText(txt(f.querySelector('.f-h')), {
        x: x + px(28), y: y + py(100), w: px(cardW - 56), h: py(60),
        fontFace: FONT, fontSize: cols === 4 ? 13 : 14, bold: true, color: C.navy
      });
      slide.addText(txt(f.querySelector('.f-b')), {
        x: x + px(28), y: y + py(166), w: px(cardW - 56), h: py(cardH - 220),
        fontFace: FONT, fontSize: 9.5, color: C.ink2, valign: 'top'
      });
    });
  }

  // Ejemplo: tabla nativa
  function rTable(slide, root) {
    slide.background = { fill: C.bg };
    chrome(slide, root);
    contentHeader(slide, root);
    const ths = [...root.querySelectorAll('.ct-table thead th')].map(th => ({
      text: txt(th),
      options: { bold: true, color: C.ink3, fontFace: FONT, fontSize: 9, charSpacing: 4,
        fill: { color: C.bg }, valign: 'middle' }
    }));
    const rows = [...root.querySelectorAll('.ct-table tbody tr')].map(tr => {
      return [...tr.querySelectorAll('td')].map(td => ({
        text: txt(td),
        options: {
          color: td.classList.contains('channel') ? C.navy : C.ink2,
          bold: td.classList.contains('channel') || td.classList.contains('right'),
          fontFace: FONT, fontSize: 10,
          fill: { color: 'FFFFFF' }, valign: 'top'
        }
      }));
    });
    slide.addTable([ths, ...rows], {
      x: px(120), y: py(360), w: px(1680),
      border: { type: 'solid', color: C.line, pt: 0.5 },
      autoPage: false, fontFace: FONT, fontSize: 10
    });
  }

  // Ejemplo: bar chart nativo con fallback
  function rBarChart(slide, root) {
    slide.background = { fill: C.bg };
    chrome(slide, root);
    contentHeader(slide, root);
    const bars = [...root.querySelectorAll('.chart-frame .bar')];
    const data = bars.map(b => {
      const num = txt(b.querySelector('.num'));
      const lbl = txt(b.querySelector('.x-label'));
      const value = parseFloat(num.replace(/[^0-9.\-]/g, '')) || 0;
      return { num, lbl, value };
    });

    try {
      slide.addChart('bar', [{
        name: 'Series',
        labels: data.map(d => d.lbl),
        values: data.map(d => d.value)
      }], {
        x: px(120), y: py(360), w: px(1680), h: py(540),
        barDir: 'col',
        chartColors: [C.blue, C.lavender, C.orange, C.tealBright],
        catAxisLabelFontFace: FONT, catAxisLabelFontSize: 9, catAxisLabelColor: C.ink3,
        valAxisLabelFontFace: FONT, valAxisLabelFontSize: 9, valAxisLabelColor: C.ink3,
        showValue: true, dataLabelFontFace: FONT, dataLabelFontSize: 10,
        dataLabelColor: C.navy, dataLabelFontBold: true,
        showLegend: false, barGapWidthPct: 60
      });
    } catch (chartErr) {
      console.warn('Chart fallback:', chartErr.message);
      // Fallback manual: dibujar barras como rects
      const cx = px(120), cy = py(380), cw = px(1680), ch = py(500);
      const max = Math.max(...data.map(d => d.value), 1);
      const colW = cw / data.length;
      const palette = [C.blue, C.lavender, C.orange, C.tealBright];
      data.forEach((d, i) => {
        const bx = cx + colW * i + colW * 0.15;
        const bw = colW * 0.7;
        const bh = ch * 0.85 * (d.value / max);
        slide.addShape('rect', {
          x: bx, y: cy + ch - bh - py(40), w: bw, h: bh,
          fill: { color: palette[i % palette.length] },
          line: { color: palette[i % palette.length], width: 0 }
        });
        slide.addText(d.num, {
          x: bx, y: cy + ch - bh - py(70), w: bw, h: py(24),
          fontFace: FONT, fontSize: 11, bold: true, color: C.navy, align: 'center'
        });
        slide.addText(d.lbl, {
          x: bx - bw * 0.2, y: cy + ch - py(36), w: bw * 1.4, h: py(36),
          fontFace: FONT, fontSize: 9, color: C.ink3, align: 'center'
        });
      });
    }
  }

  // Fallback genérico para layouts no implementados
  function rGeneric(slide, root) {
    slide.background = { fill: C.bg };
    chrome(slide, root);
    contentHeader(slide, root);
    slide.addText('(Layout sin renderer específico)', {
      x: px(120), y: py(500), w: px(1680), h: py(60),
      fontFace: FONT, fontSize: 14, color: C.ink3, align: 'center', italic: true
    });
  }

  // ============================================================
  // 7. DISPATCHER — más específico primero
  // ============================================================
  function renderSlide(s, root) {
    if (root.querySelector('.title-main')) return rTitle(s, root);
    if (root.querySelector('.sec-title')) return rSection(s, root);
    if (root.querySelector('.findings.four')) return rFindings(s, root, 4);
    if (root.querySelector('.findings')) return rFindings(s, root, 3);
    if (root.querySelector('.chart-frame')) return rBarChart(s, root);
    if (root.querySelector('.ct-frame')) return rTable(s, root);
    // ... añade más layouts aquí
    rGeneric(s, root);
  }

  // ============================================================
  // 8. MAIN
  // ============================================================
  async function exportPptx() {
    if (!btn) return;
    btn.disabled = true;
    let failedAt = null;
    try {
      elTitle.textContent = 'Cargando librería…';
      showOverlay(0);
      await loadScript('https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js');
      if (!(window.PptxGenJS || window.pptxgen)) {
        throw new Error('PptxGenJS no cargó desde CDN. Revisa tu conexión.');
      }
      elTitle.textContent = 'Precargando assets…';
      await preloadLogo();
      if (document.fonts && document.fonts.ready) await document.fonts.ready;

      const slides = Array.from(document.querySelectorAll('deck-stage > section.slide'));
      if (!slides.length) throw new Error('No hay slides para exportar');
      showOverlay(slides.length);
      elTitle.textContent = 'Generando slides editables…';

      const Ctor = window.PptxGenJS || window.pptxgen;
      const pres = new Ctor();
      pres.layout = 'LAYOUT_WIDE';
      pres.title = 'Deck · Karma Creative Lab';   // ← personaliza
      pres.author = 'Karma Creative Lab';
      pres.company = 'Karma Creative Lab';

      for (let i = 0; i < slides.length; i++) {
        const root = slides[i];
        const label = root.getAttribute('data-screen-label') || `Slide ${i + 1}`;
        progress(i + 1, slides.length, label);
        const s = pres.addSlide();
        try {
          renderSlide(s, root);
        } catch (err) {
          console.error('[PPTX] Slide', i + 1, label, 'failed:', err);
          failedAt = `Slide ${i + 1} (${label})`;
          s.addText(`Error: ${err.message}`, {
            x: px(120), y: py(450), w: px(1680), h: py(180),
            fontFace: FONT, fontSize: 14, color: 'CC0000', align: 'center'
          });
        }
        try { s.addNotes(label); } catch (_) {}
        await new Promise(r => setTimeout(r, 0));
      }

      elTitle.textContent = 'Empaquetando PPTX editable…';
      const today = new Date().toISOString().slice(0, 10);
      await pres.writeFile({ fileName: `Export-${today}.pptx` });

      elTitle.textContent = failedAt ? `✓ Descargado con ${failedAt} en error` : '✓ PPTX descargado';
      setTimeout(hideOverlay, 1800);
    } catch (err) {
      console.error('[PPTX] FATAL:', err);
      elTitle.textContent = 'Error fatal: ' + err.message;
      setTimeout(hideOverlay, 6000);
    } finally {
      btn.disabled = false;
    }
  }

  if (btn) btn.addEventListener('click', exportPptx);
})();
