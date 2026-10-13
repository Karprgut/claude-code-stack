#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Arma el HTML del artifact del radar a partir de los CSV de salidas/.

Acumula los ultimos 30 dias y deduplica por id de posteo, para que el artifact
muestre continuidad y no solo el corte de hoy.
Sistema visual: Adglow (dark + neon). Tokens exactos de
~/.claude/skills/adglow-brand-design/references/brand-systems.md
    python3 build.py --out out/radar-kcl.html
"""
import argparse, csv, glob, html, os, re
from datetime import datetime, timedelta

BASE = os.path.dirname(os.path.abspath(__file__))
MES = {"01":"ene","02":"feb","03":"mar","04":"abr","05":"may","06":"jun",
       "07":"jul","08":"ago","09":"sep","10":"oct","11":"nov","12":"dic"}
PAIS = {"MX":"México", "CO":"Colombia", "PE":"Perú", "US":"EE.UU.", "?":"Sin ubicar"}

# El design system de Adglow no admite emoji; los posteos vienen llenos.
EMOJI = re.compile("[" "\U0001F000-\U0001FAFF" "←-⇿" "⌀-➿"
                   "⬀-⯿" "️" "‍" "]+")

def corta(f):
    try:
        y, m, d = f.split("-"); return "%s %s" % (d, MES[m])
    except Exception:
        return f or "s/f"

def limpia(t):
    t = re.sub(r"\s+", " ", t or "")
    t = re.sub(r"^#\s*", "", t)
    t = re.sub(r"·\s*\d{4}-\d{2}-\d{2}T\S+\s*", "", t)
    t = re.split(r"(?:##\s*Comments|##\s*Engagement|\*\*Reshared from)", t)[0]
    t = EMOJI.sub("", t)
    t = re.sub(r"(?:#\w+[\s,]*){3,}", " ", t)   # ristras de hashtags
    return re.sub(r"\s{2,}", " ", t).strip(" ·-—|")

def recorta(t, n):
    """Corta en palabra completa, nunca a media."""
    t = t.strip()
    if len(t) <= n: return t, ""
    corte = t.rfind(" ", 0, n)
    if corte < n * 0.6: corte = n
    return t[:corte].rstrip(" ,;:·-—") + "…", t[corte:].strip()

def senal(score):
    """Semantica de Adglow: magenta = señal fuerte, verde = media, cyan = baja."""
    s = int(score or 0)
    if s >= 4: return "s-alta", "Señal alta"
    if s >= 2: return "s-media", "Señal media"
    return "s-baja", "Señal baja"

def carga(dias):
    corte = (datetime.now() - timedelta(days=dias)).strftime("%Y-%m-%d")
    filas = {}
    for ruta in sorted(glob.glob(os.path.join(BASE, "salidas", "radar-*.csv"))):
        try:
            for r in csv.DictReader(open(ruta, encoding="utf-8")):
                if (r.get("fecha") or "") < corte: continue
                k = r.get("id") or r.get("url")
                if k and k not in filas: filas[k] = r
        except Exception:
            continue
    out = list(filas.values())
    # Menos comentarios = menos cola de agencias por delante.
    def opo(f):
        c = f.get("comentarios")
        c = int(c) if str(c).isdigit() else 999
        return (f.get("fecha",""), -c, int(f.get("score") or 0))
    out.sort(key=opo, reverse=True)
    return out

def competencia(n):
    """Cuantas agencias ya comentaron. Verde = pista libre, magenta = quemado."""
    if not str(n).isdigit(): return "", ""
    n = int(n)
    if n <= 12:  return "libre",  "%d comentarios" % n
    if n <= 40:  return "media",  "%d comentarios" % n
    return "quemado", "%d comentarios" % n

def construye(filas):
    hoy = datetime.now()
    rec = (hoy - timedelta(days=8)).strftime("%Y-%m-%d")
    n_rec   = sum(1 for f in filas if (f.get("fecha") or "") >= rec)
    def _c(f):
        c = f.get("comentarios"); return int(c) if str(c).isdigit() else 999
    n_libres = sum(1 for f in filas if _c(f) <= 12)

    tarjetas = []
    for f in filas:
        cls, etq = senal(f.get("score"))
        fresco = (f.get("fecha") or "") >= rec
        mk = (f.get("mercado") or "?").strip() or "?"
        # El indice entrega el primer parrafo como "titulo" y lo repite en el
        # texto: se parte un solo cuerpo en vez de pelearse con el duplicado.
        pleno = limpia(f.get("extracto")) or limpia(f.get("titulo"))
        titulo, resto = recorta(pleno, 92)
        extracto, _ = recorta(resto, 230)
        ccls, cetq = competencia(f.get("comentarios"))
        autor = (f.get("autor") or "").strip()
        aurl  = (f.get("autor_url") or "").strip()
        quien = ""
        if autor and autor != "s/n":
            seg = f.get("seguidores")
            seg = (" · %s seguidores" % format(int(seg), ",").replace(",", " ")) if str(seg).isdigit() else ""
            quien = ('<p class="quien">%s%s</p>'
                     % ('<a href="%s" target="_blank" rel="noopener">%s</a>'
                        % (html.escape(aurl), html.escape(autor)) if aurl else html.escape(autor),
                        html.escape(seg)))
        tarjetas.append(
          '<article class="t" data-fresco="%s" data-mk="%s">'
          '<header class="t-top"><time>%s</time>'
          '<span class="chip mk">%s</span>'
          '<span class="chip %s">%s</span>%s%s</header>'
          '<h2>%s</h2>%s<p>%s</p>'
          '<a class="ir" href="%s" target="_blank" rel="noopener">Abrir posteo</a>'
          '</article>' % (
            "1" if fresco else "0", html.escape(mk),
            html.escape(corta(f.get("fecha",""))),
            html.escape(PAIS.get(mk, mk)), cls, html.escape(etq),
            ('<span class="chip %s">%s</span>' % (ccls, html.escape(cetq))) if ccls else "",
            '<span class="chip nuevo">Nuevo</span>' if fresco else "",
            html.escape(titulo) or "Sin título", quien, html.escape(extracto),
            html.escape(f.get("url") or "#")))

    return (TPL.replace("@@TARJETAS@@", "\n".join(tarjetas))
               .replace("@@TOTAL@@", str(len(filas)))
               .replace("@@RECIENTES@@", str(n_rec))
               .replace("@@LIBRES@@", str(n_libres))
               .replace("@@SELLO@@", hoy.strftime("%d de ") + MES[hoy.strftime("%m")]
                                     + hoy.strftime(" · %H:%M")))

TPL = r"""<title>Radar de demanda</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500;700&display=swap">
<style>
/* Lista de prospectos sobre superficie elevada, grid de 48px al fondo.
   Sistema Adglow: dark + neon, el color significa (no decora). */
:root{
  --ink:#0b0b10; --ink-elev:#14141a;
  --fg-1:rgba(255,255,255,1); --fg-2:rgba(255,255,255,.60);
  --fg-3:rgba(255,255,255,.40); --fg-4:rgba(255,255,255,.25);
  --magenta:#F00A5E; --cyan:#00D9FF; --green:#B0DA09; --orange:#F99400;
  --border-hair:rgba(255,255,255,.06); --border-cyan:rgba(0,217,255,.15);
  --glow-cyan:0 0 25px rgba(0,217,255,.30),0 0 50px rgba(0,217,255,.15);
  --glow-magenta:0 0 25px rgba(240,10,94,.30),0 0 50px rgba(240,10,94,.15);
  --glow-orange:0 0 25px rgba(249,148,0,.30),0 0 50px rgba(249,148,0,.15);
  --sans:'Space Grotesk',-apple-system,BlinkMacSystemFont,sans-serif;
  --mono:'IBM Plex Mono',ui-monospace,Menlo,monospace;
  color-scheme:dark;
}
*{box-sizing:border-box}
body{
  margin:0;background:var(--ink);color:var(--fg-1);
  font-family:var(--sans);font-size:15px;line-height:1.5;
  background-image:
    linear-gradient(rgba(0,217,255,.025) 1px,transparent 1px),
    linear-gradient(90deg,rgba(0,217,255,.025) 1px,transparent 1px);
  background-size:48px 48px;
  -webkit-font-smoothing:antialiased;
}
.scan{position:fixed;inset:0;pointer-events:none;z-index:1;
  background:repeating-linear-gradient(rgba(255,255,255,.012) 0 1px,transparent 1px 3px)}
.wrap{position:relative;z-index:2;max-width:800px;margin:0 auto;
  padding:0 16px;padding-block:32px 60px}

.eyebrow{font-family:var(--mono);font-size:10px;font-weight:500;
  letter-spacing:.25em;text-transform:uppercase;color:var(--cyan);margin:0 0 14px}
h1{font-family:var(--sans);font-weight:700;text-transform:uppercase;
  letter-spacing:-.02em;line-height:.95;font-size:clamp(32px,7.5vw,54px);
  margin:0;text-wrap:balance}
.sub{color:var(--fg-2);margin:14px 0 0;max-width:60ch;font-size:15px}

.kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:30px 0 0}
.kpi{background:var(--ink-elev);border:1px solid var(--border-hair);
  border-top:2px solid var(--cyan);padding:16px 16px 14px}
.kpi:nth-child(2){border-top-color:var(--orange)}
.kpi:nth-child(3){border-top-color:var(--green)}
.kpi b{display:block;font-family:var(--sans);font-weight:700;font-size:34px;
  line-height:1;letter-spacing:-.02em;font-variant-numeric:tabular-nums;
  color:var(--cyan);text-shadow:var(--glow-cyan)}
.kpi:nth-child(2) b{color:var(--orange);text-shadow:var(--glow-orange)}
.kpi:nth-child(3) b{color:var(--green);text-shadow:0 0 25px rgba(176,218,9,.3)}
.kpi span{display:block;font-family:var(--mono);font-size:9.5px;font-weight:400;
  letter-spacing:.25em;text-transform:uppercase;color:var(--fg-3);margin-top:9px}

.section-label{display:flex;align-items:baseline;gap:10px;margin:40px 0 16px;
  padding-bottom:8px;border-bottom:1px solid var(--border-cyan);
  font-family:var(--mono);font-size:10px;font-weight:500;letter-spacing:.25em;
  text-transform:uppercase;color:var(--fg-2)}
.section-label i{font-style:normal;color:var(--cyan)}

.filtros{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 20px}
.filtros button{font-family:var(--mono);font-size:10px;font-weight:500;
  letter-spacing:.18em;text-transform:uppercase;padding:8px 13px;
  border:1px solid var(--border-hair);background:var(--ink-elev);
  color:var(--fg-2);cursor:pointer;transition:border-color .15s,color .15s}
.filtros button:hover{color:var(--fg-1);border-color:var(--border-cyan)}
.filtros button[aria-pressed="true"]{color:var(--ink);background:var(--cyan);
  border-color:var(--cyan);font-weight:700}
.filtros button:focus-visible{outline:2px solid var(--cyan);outline-offset:2px}

.lista{display:flex;flex-direction:column;gap:12px}
.t{background:var(--ink-elev);border:1px solid var(--border-hair);
  border-left:2px solid var(--fg-4);padding:18px 20px;min-width:0}
.t:has(.libre){border-left-color:var(--green)}
.t:has(.quemado){border-left-color:var(--magenta)}
.t-top{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:11px}
.t-top time{font-family:var(--mono);font-size:10px;font-weight:500;
  letter-spacing:.2em;text-transform:uppercase;color:var(--fg-3)}
.chip{font-family:var(--mono);font-size:9px;font-weight:500;letter-spacing:.16em;
  text-transform:uppercase;padding:3px 8px;border:1px solid currentColor}
.chip.mk{color:var(--cyan)}
.chip.s-alta{color:var(--magenta)}
.chip.s-media{color:var(--green)}
.chip.s-baja{color:var(--fg-3)}
.chip.nuevo{color:var(--ink);background:var(--orange);border-color:var(--orange);
  font-weight:700}
.chip.libre{color:var(--green)}
.chip.media{color:var(--orange)}
.chip.quemado{color:var(--magenta)}
.quien{margin:0 0 10px;font-family:var(--mono);font-size:10px;letter-spacing:.12em;
  text-transform:uppercase;color:var(--fg-3)}
.quien a{color:var(--cyan);text-decoration:none;border-bottom:1px solid var(--border-cyan)}
.quien a:hover{color:var(--fg-1)}
.t h2{font-family:var(--sans);font-weight:700;font-size:17px;line-height:1.25;
  letter-spacing:-.01em;margin:0 0 9px;text-wrap:balance;color:var(--fg-1)}
.t p{margin:0 0 15px;color:var(--fg-2);font-size:14px;line-height:1.55}
.ir{display:inline-block;font-family:var(--mono);font-size:10px;font-weight:500;
  letter-spacing:.2em;text-transform:uppercase;text-decoration:none;
  color:var(--cyan);border:1px solid var(--border-cyan);padding:8px 14px;
  transition:background .15s,color .15s}
.ir:hover{background:var(--cyan);color:var(--ink)}
.ir:focus-visible{outline:2px solid var(--cyan);outline-offset:2px}

.vacio{border:1px dashed var(--border-hair);padding:32px;text-align:center;
  color:var(--fg-3);font-family:var(--mono);font-size:10px;letter-spacing:.25em;
  text-transform:uppercase}
footer{margin-top:44px;border-top:1px solid var(--border-hair);padding-top:16px;
  font-family:var(--mono);font-size:9.5px;letter-spacing:.14em;
  text-transform:uppercase;color:var(--fg-3);line-height:2}
@media (max-width:430px){.kpis{grid-template-columns:1fr 1fr}.kpi:last-child{display:none}}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
</style>

<div class="scan" aria-hidden="true"></div>
<div class="wrap">
  <p class="eyebrow">Adglow · Prospección</p>
  <h1>Radar de demanda</h1>
  <p class="sub">Empresas que pidieron agencia en LinkedIn — paid, CRM, programática, retail media, audiencias, IA, offline, influencers. México, Colombia, Perú y Estados Unidos. Se rastrea solo cada mañana a las 10:00; aquí vive el acumulado de 30 días.</p>

  <div class="kpis">
    <div class="kpi"><b>@@TOTAL@@</b><span>En el tablero</span></div>
    <div class="kpi"><b>@@RECIENTES@@</b><span>Última semana</span></div>
    <div class="kpi"><b>@@LIBRES@@</b><span>Con pista libre</span></div>
  </div>

  <p class="section-label"><i>⬡ 01</i> · Prospectos</p>
  <nav class="filtros" aria-label="Filtros">
    <button type="button" data-f="todos" aria-pressed="true">Todos</button>
    <button type="button" data-f="frescos" aria-pressed="false">Última semana</button>
    <button type="button" data-f="MX" aria-pressed="false">México</button>
    <button type="button" data-f="CO" aria-pressed="false">Colombia</button>
    <button type="button" data-f="PE" aria-pressed="false">Perú</button>
    <button type="button" data-f="US" aria-pressed="false">EE.UU.</button>
  </nav>

  <div class="lista" id="lista">
@@TARJETAS@@
  </div>
  <p class="vacio" id="vacio" hidden>Nada con ese filtro</p>

  <footer>
    Último barrido: @@SELLO@@<br>
    Cuarenta formulaciones diarias: catorce solo de México, diez por disciplina (paid, CRM, programática, retail media, audiencias, IA, offline, influencers, PR, analítica) y once en inglés para Estados Unidos. Se descartan vacantes, autopromoción de agencias, encargos de freelance, posteos ya cerrados y países fuera de los cuatro mercados.<br>
    Ordenados por pista libre: los comentarios son las agencias que ya se formaron. Arriba de 40 el posteo está quemado. La señal mide qué tan claro se pide agencia, no qué tan bueno es el prospecto.
  </footer>
</div>

<script>
(function(){
  var btns = document.querySelectorAll('.filtros button');
  var tarjetas = document.querySelectorAll('.t');
  var vacio = document.getElementById('vacio');
  function aplica(f){
    var visibles = 0;
    tarjetas.forEach(function(t){
      var ok = f === 'todos'
            || (f === 'frescos' && t.dataset.fresco === '1')
            || t.dataset.mk === f;
      t.hidden = !ok; if (ok) visibles++;
    });
    vacio.hidden = visibles > 0;
    btns.forEach(function(b){ b.setAttribute('aria-pressed', String(b.dataset.f === f)); });
    try { localStorage.setItem('radar-filtro', f); } catch (e) {}
  }
  btns.forEach(function(b){ b.addEventListener('click', function(){ aplica(b.dataset.f); }); });
  var guardado = 'todos';
  try { guardado = localStorage.getItem('radar-filtro') || 'todos'; } catch (e) {}
  if (guardado !== 'todos') aplica(guardado);
})();
</script>
"""

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(BASE, "out", "radar-kcl.html"))
    ap.add_argument("--dias", type=int, default=30)
    a = ap.parse_args()
    filas = carga(a.dias)
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    open(a.out, "w", encoding="utf-8").write(construye(filas))
    print("%d prospectos -> %s" % (len(filas), a.out))
