#!/usr/bin/env python3
import json, os, html
OUT = os.path.dirname(os.path.abspath(__file__))
plan = json.load(open(f"{OUT}/plan.json"))
DUR = [p["D"] for p in plan]

# ---- scene content (reinterpreted in the Havas "intelligence layer" language) ----
S = [
 {"layout":"intro","wordmark":"HAVAS","eyebrow":"MEDIA & PERFORMANCE","sub":"Convertimos la innovación en resultados."},
 {"layout":"title","eyebrow":"CASOS DE ESTUDIO","headline":"VERTICAL QSR","big":True,"sub":"Liderando la innovación en medios.","hud":"HAVAS HUB · 950+ RESTAURANTS"},
 {"layout":"list","eyebrow":"EL DESAFÍO · SECTOR QSR","headline":"TRES BARRERAS","items":["Innovación estancada","Territorios sin explorar","Optimización limitada"]},
 {"layout":"list","eyebrow":"EL ENFOQUE HAVAS","headline":"MÁS QUE AVISOS, RESULTADOS","items":["Momentos culturales","Inversión estratégica","Resultados medibles"]},
 {"layout":"case","eyebrow":"CASO DE ÉXITO","headline":"EL ASCENSO AL LIDERAZGO","brand":"LITTLE CAESAR'S"},
 {"layout":"stats","eyebrow":"LITTLE CAESAR'S · RESULTADOS","stats":[
    {"prefix":"+","value":200,"suffix":"M","label":"PIZZAS VENDIDAS / AÑO"},
    {"prefix":"#","value":2,"suffix":"","label":"SHARE QSR 2024","accent":True}]},
 {"layout":"case","eyebrow":"CASO DE ÉXITO","headline":"CONECTANDO CLIMA Y CONSUMO","brand":"McDONALD'S"},
 {"layout":"stats","eyebrow":"PUBLICIDAD CONTEXTUAL","stats":[
    {"prefix":"+","value":195,"suffix":"K","label":"INTERACCIONES","accent":True},
    {"prefix":"","value":50,"suffix":"","label":"CREATIVIDADES ACTIVADAS"}]},
 {"layout":"case","eyebrow":"CASO DE ÉXITO","headline":"GEOLOCALIZACIÓN ESTRATÉGICA","brand":"DOMINO'S"},
 {"layout":"stats","eyebrow":"CAMPAÑA · PIZZA WEEK","stats":[
    {"prefix":"","value":40,"suffix":"K","label":"PIZZAS VENDIDAS"},
    {"prefix":"+","value":21,"suffix":"%","label":"INGRESOS POR VENTAS","accent":True}]},
 {"layout":"case","eyebrow":"CASO DE ÉXITO","headline":"DEL IMPACTO DIGITAL A LA TIENDA","brand":"PIZZA HUT"},
 {"layout":"stats","eyebrow":"ESTRATEGIA DRIVE-TO-STORE","stats":[
    {"prefix":"","value":7,"suffix":"","label":"CIUDADES ACTIVADAS"},
    {"prefix":"+","value":21.5,"suffix":"%","decimals":1,"label":"VENTAS FÍSICAS","accent":True}]},
 {"layout":"list","eyebrow":"NUESTRO PLAYBOOK","headline":"PARA ESCALAR","items":["Construcción masiva","Defensa y expansión","Hiper-personalización","Atribución exacta"]},
 {"layout":"list","eyebrow":"MODELO HAVAS","headline":"3 PALANCAS DE NEGOCIO","items":["Innovación inmediata","Optimización quirúrgica","Transparencia total"]},
 {"layout":"statement","eyebrow":"LA PROPUESTA","headline":"PILOTO 90 DÍAS · SIN RIESGO","sub":"Cero costos operativos. Ingresos compartidos. Operación seamless."},
 {"layout":"close","wordmark":"HAVAS","headline":"UN EQUIPO SÓLIDO QUE SOPORTA LA OPERACIÓN","eyebrow":"MEDIA & PERFORMANCE"},
]
assert len(S)==len(DUR)==16

def esc(s): return html.escape(s, quote=True)

def build_scene(i, sc):
    L = sc["layout"]; parts=[]
    def eyebrow(t): return f'<div class="eyebrow" data-a="scramble" data-d="0.15" data-u="0.55" data-text="{esc(t)}"></div>'
    def headline(t, big=False, size=None):
        cls = "headline big" if big else "headline"
        st = f' style="font-size:{size}px"' if size else ''
        return f'<div class="{cls}"{st} data-a="scramble" data-d="0.35" data-u="0.8" data-text="{esc(t)}"></div>'
    def sub(t): return f'<div class="sub" data-a="fadeup" data-d="0.95" data-u="0.55">{esc(t)}</div>'
    def wordmark(t): return f'<div class="wordmark" data-a="fadeup" data-d="0.05" data-u="0.6">{esc(t)}</div>'
    def brand(t): return f'<div class="brand" data-a="fadeup" data-d="0.7" data-u="0.6">{esc(t)}</div>'
    def hud(t): return f'<div class="hudline" data-a="fadeup" data-d="1.2" data-u="0.5"><span class="tick"></span>{esc(t)}</div>'
    def items(arr):
        rows=[]
        for k,it in enumerate(arr):
            dl=0.8+k*0.22
            rows.append(f'<div class="item" data-a="fadeup" data-d="{dl:.2f}" data-u="0.5">'
                        f'<span class="inum">{k+1:02d}</span><span class="ilabel">{esc(it)}</span></div>')
        return '<div class="items">'+''.join(rows)+'</div>'
    def stats(arr):
        cells=[]
        for k,stt in enumerate(arr):
            dl=0.7+k*0.3
            acc="accent" if stt.get("accent") else ""
            cells.append(
              f'<div class="stat">'
              f'<span class="stick"></span>'
              f'<div class="sval {acc}" data-a="count" data-d="{dl:.2f}" data-u="1.1" '
              f'data-prefix="{esc(stt.get("prefix",""))}" data-value="{stt["value"]}" '
              f'data-suffix="{esc(stt.get("suffix",""))}" data-decimals="{stt.get("decimals",0)}"></div>'
              f'<div class="slabel" data-a="fadeup" data-d="{dl+0.15:.2f}" data-u="0.5">{esc(stt["label"])}</div>'
              f'</div>')
        return '<div class="stats">'+''.join(cells)+'</div>'

    if L=="intro":
        parts=[f'<div class="center-block intro">', wordmark(sc["wordmark"]),
               f'<div class="wm-sub" data-a="scramble" data-d="0.6" data-u="0.7" data-text="· {esc(sc["eyebrow"])} ·"></div>',
               sub(sc["sub"]), '</div>']
    elif L=="title":
        parts=[eyebrow(sc["eyebrow"]), headline(sc["headline"], big=sc.get("big")), sub(sc["sub"]), hud(sc["hud"])]
    elif L=="list":
        parts=[eyebrow(sc["eyebrow"]), headline(sc["headline"], size=64), items(sc["items"])]
    elif L=="case":
        parts=[eyebrow(sc["eyebrow"]), headline(sc["headline"], size=60), brand(sc["brand"])]
    elif L=="stats":
        parts=[eyebrow(sc["eyebrow"]), stats(sc["stats"])]
    elif L=="statement":
        parts=[eyebrow(sc["eyebrow"]), headline(sc["headline"], size=76), sub(sc["sub"])]
    elif L=="close":
        parts=[eyebrow(sc["eyebrow"]), headline(sc["headline"], size=54),
               f'<div class="wordmark small" data-a="fadeup" data-d="1.0" data-u="0.6">{esc(sc["wordmark"])}</div>']
    body="".join(parts)
    return (f'<div class="scene" data-i="{i}">'
            f'<div class="topbar"><span class="tb-l">VERTICAL QSR × HAVAS</span></div>'
            f'<div class="content">{body}</div>'
            f'<div class="botbar"><span class="bb-l">REPORTSHAVAS.COM</span>'
            f'<span class="bb-r">SCENE {i+1:02d} / 16<span class="dot"></span></span></div>'
            f'</div>')

scenes_html = "\n".join(build_scene(i,sc) for i,sc in enumerate(S))

HTML = f"""<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=JetBrains+Mono:wght@400;500;700&family=Archivo+Black&display=swap" rel="stylesheet">
<link href="https://api.fontshare.com/v2/css?f[]=general-sans@500,600,700&display=swap" rel="stylesheet">
<style>
:root{{--void:#000;--ink:#0a0a0a;--ink1:#111;--ink3:#262626;--bone:#fafafa;--bmute:#a3a3a3;--bdim:#737373;--signal:#e60023;}}
*{{margin:0;padding:0;box-sizing:border-box;}}
html,body{{width:1920px;height:1080px;background:var(--void);overflow:hidden;}}
#stage{{position:relative;width:1920px;height:1080px;background:
   radial-gradient(1200px 900px at 50% 118%, rgba(230,0,35,0.12), transparent 60%), var(--ink);
   font-family:"General Sans",system-ui,sans-serif;overflow:hidden;}}
#grid{{position:absolute;inset:0;pointer-events:none;opacity:.045;
   background-image:linear-gradient(var(--ink3) 1px,transparent 1px),linear-gradient(90deg,var(--ink3) 1px,transparent 1px);
   background-size:80px 80px;}}
#scan{{position:absolute;left:0;right:0;height:2px;pointer-events:none;opacity:.14;
   background:linear-gradient(90deg,transparent,var(--signal),transparent);}}
#vig{{position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 300px rgba(0,0,0,.7);}}
.scene{{position:absolute;inset:0;display:none;padding:96px 130px;}}
.content{{position:absolute;left:130px;right:130px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;}}
.topbar,.botbar{{position:absolute;left:130px;right:130px;display:flex;justify-content:space-between;align-items:center;
   font-family:"JetBrains Mono",monospace;font-size:14px;letter-spacing:.28em;color:var(--bdim);text-transform:uppercase;}}
.topbar{{top:60px;}} .botbar{{bottom:56px;}}
.botbar .bb-r{{color:var(--bmute);display:flex;align-items:center;gap:12px;}}
.dot{{width:9px;height:9px;border-radius:50%;background:var(--signal);display:inline-block;}}

.eyebrow{{font-family:"JetBrains Mono",monospace;font-size:16px;font-weight:500;letter-spacing:.32em;
   text-transform:uppercase;color:var(--signal);margin-bottom:30px;min-height:20px;}}
.headline{{font-family:"Bricolage Grotesque",sans-serif;font-weight:800;font-size:64px;line-height:.92;
   letter-spacing:-.03em;text-transform:uppercase;color:var(--bone);max-width:1450px;}}
.headline.big{{font-size:150px;}}
.sub{{font-family:"General Sans",sans-serif;font-weight:500;font-size:27px;line-height:1.4;color:var(--bmute);
   margin-top:30px;max-width:1150px;}}

.wordmark{{font-family:"Archivo Black","Bricolage Grotesque",sans-serif;font-size:170px;line-height:.85;
   letter-spacing:-.02em;color:var(--signal);text-transform:uppercase;}}
.wordmark.small{{font-size:70px;margin-top:40px;}}
.center-block.intro{{display:flex;flex-direction:column;align-items:flex-start;}}
.wm-sub{{font-family:"JetBrains Mono",monospace;font-size:22px;letter-spacing:.42em;color:var(--bmute);
   text-transform:uppercase;margin-top:26px;min-height:26px;}}

.brand{{font-family:"Bricolage Grotesque",sans-serif;font-weight:800;font-size:104px;line-height:.9;letter-spacing:-.03em;
   text-transform:uppercase;color:var(--bone);margin-top:40px;}}
.hudline{{font-family:"JetBrains Mono",monospace;font-size:16px;letter-spacing:.26em;color:var(--bmute);
   text-transform:uppercase;margin-top:44px;display:flex;align-items:center;gap:12px;}}
.tick{{width:26px;height:2px;background:var(--signal);display:inline-block;}}

.items{{display:flex;flex-direction:column;gap:22px;margin-top:44px;}}
.item{{display:flex;align-items:baseline;gap:28px;border-left:3px solid var(--signal);padding:10px 0 10px 28px;}}
.inum{{font-family:"JetBrains Mono",monospace;font-size:22px;font-weight:700;color:var(--signal);}}
.ilabel{{font-family:"Bricolage Grotesque",sans-serif;font-weight:700;font-size:40px;letter-spacing:-.02em;color:var(--bone);text-transform:uppercase;}}

.stats{{display:flex;gap:130px;margin-top:20px;}}
.stat{{position:relative;padding-top:22px;}}
.stick{{position:absolute;top:0;left:0;width:64px;height:4px;background:var(--signal);}}
.sval{{font-family:"JetBrains Mono",monospace;font-weight:700;font-size:150px;line-height:.9;letter-spacing:-.03em;
   color:var(--bone);font-variant-numeric:tabular-nums slashed-zero;}}
.sval.accent{{color:var(--signal);}}
.slabel{{font-family:"JetBrains Mono",monospace;font-size:18px;letter-spacing:.22em;color:var(--bmute);
   text-transform:uppercase;margin-top:22px;}}
</style></head>
<body>
<div id="stage">
  <div id="grid"></div><div id="scan"></div>
  {scenes_html}
  <div id="vig"></div>
</div>
<script>
const DUR={json.dumps(DUR)};
const STARTS=[]; let acc=0; for(const d of DUR){{STARTS.push(acc); acc+=d;}}
const TOTAL=acc;
const scenes=[...document.querySelectorAll('.scene')];
const CHARS="!<>-_\\\\/[]{{}}=+*^?#01OX";
function clamp01(x){{return x<0?0:x>1?1:x;}}
function eoc(x){{return 1-Math.pow(1-x,3);}}
function rnd(i,tick){{let x=Math.sin((i+1)*127.1+tick*311.7)*43758.5453;return x-Math.floor(x);}}
function fmt(v,dec){{v=v.toFixed(dec); let p=v.split('.'); p[0]=p[0].replace(/\\B(?=(\\d{{3}})+(?!\\d))/g,','); return p.join('.');}}
function scr(text,lt,delay,dur){{
  const len=text.length; const tick=Math.floor(lt*22); let out="";
  for(let i=0;i<len;i++){{const ch=text[i];
    if(ch===' '){{out+=' ';continue;}}
    const rt=delay+dur*(0.15+0.7*(i/Math.max(len,1)));
    if(lt>=rt) out+=ch;
    else if(lt<delay) out+=' ';
    else out+=CHARS[Math.floor(rnd(i,tick)*CHARS.length)];
  }}
  return out;
}}
function applyEl(el,lt){{
  const a=el.dataset.a, d=parseFloat(el.dataset.d), u=parseFloat(el.dataset.u);
  if(a==='scramble'){{
    el.textContent=scr(el.dataset.text,lt,d,u);
    el.style.opacity=clamp01((lt-d)/0.2);
  }} else if(a==='fadeup'){{
    const p=eoc(clamp01((lt-d)/u));
    el.style.opacity=p; el.style.transform='translateY('+((1-p)*22)+'px)';
  }} else if(a==='count'){{
    const p=eoc(clamp01((lt-d)/u));
    const val=parseFloat(el.dataset.value)*p;
    el.textContent=el.dataset.prefix+fmt(val,parseInt(el.dataset.decimals))+el.dataset.suffix;
    el.style.opacity=clamp01((lt-d)/0.2);
  }}
}}
function seek(t){{
  t=Math.max(0,Math.min(t,TOTAL-0.001));
  let idx=0; for(let i=0;i<DUR.length;i++){{if(t>=STARTS[i]) idx=i;}}
  const lt=t-STARTS[idx], D=DUR[idx];
  scenes.forEach((s,k)=>{{ s.style.display = (k===idx)?'block':'none'; }});
  const sc=scenes[idx];
  const fin=clamp01(lt/0.4), fout=clamp01((D-lt)/0.35);
  sc.style.opacity=Math.min(fin,fout);
  sc.querySelectorAll('[data-a]').forEach(el=>applyEl(el,lt));
  // chrome motion
  document.getElementById('scan').style.top=((t*20)%100)+'%';
  document.getElementById('stage').querySelectorAll('.dot').forEach(dt=>{{dt.style.opacity=(0.45+0.55*Math.abs(Math.sin(t*3.1))).toFixed(3);}});
}}
window.seek=seek; window.TOTAL=TOTAL;
document.fonts.ready.then(()=>{{window.__ready=true;}});
seek(0);
</script>
</body></html>"""

open(f"{OUT}/reel.html","w").write(HTML)
_total=sum(DUR)
print(f"reel.html written · scenes={len(S)} · total={_total:.2f}s · frames@30={round(_total*30)}")
