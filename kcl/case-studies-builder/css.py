# -*- coding: utf-8 -*-
"""Sistema visual de los case studies de Karma Creative Lab (brutalista).
Deriva del case study de Niko Niko: marco duro, sombra sólida, acento por proyecto."""

FONTS = ("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700"
         "&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap")

def css(ns, accent="#39FF14", accent2="#2D5BFF"):
    """CSS namespeado bajo .<ns> para que no choque con el tema de Shopify."""
    n = f".{ns}"
    return f"""
@import url('{FONTS}');
{n}{{
  --ink:#0A0A0A;--paper:#FFFFFF;--paper-2:#F2F2F2;
  --neon:{accent};--blue:{accent2};
  --line:4px solid var(--ink);--shadow:10px 10px 0 var(--ink);--shadow-sm:6px 6px 0 var(--ink);
  font-family:'Inter',system-ui,sans-serif;color:var(--ink);line-height:1.6;
  width:100%;max-width:100%;overflow-x:hidden;-webkit-font-smoothing:antialiased;
}}
{n} *{{box-sizing:border-box}}

/* ---- blindaje contra el tema de Shopify ----------------------------------
   El tema del blog inyecta mayúsculas en los títulos, una barra a la izquierda
   de los h2 y su verde de marca en <strong>. Se neutraliza con el namespace
   duplicado (más específico) y va ANTES de los componentes, para que las reglas
   propias de abajo sigan ganando los empates. */
{n}{n} h1,{n}{n} h2,{n}{n} h3,{n}{n} h4{{
  text-transform:none;border:0;padding:0;background:none;
  font-family:'Space Grotesk',sans-serif;line-height:1.04;letter-spacing:-0.02em}}
{n}{n} strong,{n}{n} b{{color:inherit}}
{n}{n} em,{n}{n} i{{color:inherit;font-style:normal}}
{n}{n} p,{n}{n} li,{n}{n} td,{n}{n} th,{n}{n} dt,{n}{n} dd,{n}{n} span,{n}{n} small{{text-transform:none}}
{n}{n} a{{text-decoration:none}}
{n}{n} ul,{n}{n} ol{{margin:0;padding:0;list-style:none}}
{n}{n} table{{border-collapse:collapse}}
{n}{n} img{{max-width:100%;height:auto;border-radius:0}}
{n}{n} svg{{max-width:100%}}
{n}{n} dl,{n}{n} dd,{n}{n} dt{{margin:0}}
{n} .wrap{{max-width:1000px;margin:0 auto;padding:0}}
{n} h1,{n} h2,{n} h3,{n} h4{{font-family:'Space Grotesk',sans-serif;line-height:1.04;letter-spacing:-0.02em;margin:0}}
{n} .mono{{font-family:'IBM Plex Mono',monospace}}

{n} .masthead{{background:var(--ink);color:var(--paper);border:var(--line);border-radius:16px}}
{n} .masthead .wrap{{display:flex;justify-content:space-between;align-items:center;padding:14px 22px;flex-wrap:wrap;gap:8px;max-width:100%}}
{n} .kcl-mark{{font-family:'Space Grotesk';font-weight:700;font-size:18px;letter-spacing:0.04em;text-transform:uppercase}}
{n} .kcl-mark span{{color:var(--neon)}}
{n} .masthead .tag{{font-size:12px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;border:2px solid var(--neon);color:var(--neon);padding:6px 12px;border-radius:999px}}

{n} .hero{{border:var(--line);border-radius:18px;box-shadow:var(--shadow);margin-top:22px;padding:48px 0 40px;
  background:radial-gradient(circle at 12% 18%,{accent}1f,transparent 42%),radial-gradient(circle at 88% 8%,{accent2}24,transparent 44%),var(--paper)}}
{n} .hero .wrap{{padding:0 28px}}
{n} .eyebrow{{display:inline-block;font-family:'Space Grotesk';font-weight:700;font-size:13px;letter-spacing:0.20em;text-transform:uppercase;background:var(--neon);color:var(--ink);padding:8px 14px;border:3px solid var(--ink);box-shadow:var(--shadow-sm);transform:rotate(-1.5deg)}}
{n} .hero h1{{font-size:clamp(32px,5.5vw,56px);font-weight:700;margin:26px 0 18px}}
{n} .hero h1 em{{font-style:normal;color:var(--blue)}}
{n} .dek{{font-size:clamp(17px,2.1vw,21px);max-width:780px;color:#1a1a1a;margin:0}}
{n} .dek strong{{font-weight:700}}

{n} .meta{{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));border:var(--line);box-shadow:var(--shadow);margin:40px 0 8px;background:var(--paper-2)}}
{n} .meta div{{padding:18px 20px;border-right:3px solid var(--ink)}}
{n} .meta div:last-child{{border-right:none}}
{n} .meta dt{{font-size:11px;letter-spacing:0.16em;text-transform:uppercase;font-weight:700;color:#6b6b6b;margin-bottom:6px}}
{n} .meta dd{{font-family:'Space Grotesk';font-weight:600;font-size:16px;margin:0}}

{n} section{{padding:44px 0}}
{n} .sec-head{{display:flex;align-items:baseline;gap:16px;margin-bottom:10px}}
{n} .sec-num{{font-family:'Space Grotesk';font-weight:700;font-size:15px;color:var(--neon);background:var(--ink);border:3px solid var(--ink);width:46px;height:46px;display:flex;align-items:center;justify-content:center;flex:0 0 auto;box-shadow:var(--shadow-sm);border-radius:50%}}
{n} h2{{font-size:clamp(26px,3.6vw,40px);font-weight:700}}
{n} .lead{{font-size:18px;max-width:760px;margin:18px 0 0;color:#1f1f1f}}
{n} p{{margin:16px 0 0;color:#2b2b2b}}
{n} .body-narrow{{max-width:760px}}
{n} .divider{{height:0;border-top:var(--line);max-width:1000px;margin:0 auto}}

{n} .shot{{border:var(--line);box-shadow:var(--shadow);background:#fff;margin-top:30px;border-radius:6px;overflow:hidden}}
{n} .shot .bar{{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:3px solid var(--ink);background:var(--paper-2)}}
{n} .shot .dot{{width:13px;height:13px;border-radius:50%;border:2px solid var(--ink)}}
{n} .d1{{background:var(--neon)}}{n} .d2{{background:var(--blue)}}{n} .d3{{background:var(--ink)}}
{n} .shot .url{{margin-left:10px;font-family:'Space Grotesk';font-size:13px;font-weight:500;background:#fff;border:2px solid var(--ink);border-radius:999px;padding:4px 14px;color:#444;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
{n} .shot img{{display:block;width:100%;height:auto;margin:0}}
{n} .shot.tall{{max-height:620px;overflow:hidden;position:relative}}
{n} .shot.tall::after{{content:"\\2193 la pantalla sigue hacia abajo";position:absolute;bottom:0;left:0;right:0;padding:34px 0 12px;text-align:center;font-family:'Space Grotesk';font-size:12px;font-weight:600;color:#555;background:linear-gradient(transparent,var(--paper) 78%)}}

{n} .pills{{display:flex;flex-wrap:wrap;gap:10px;margin-top:24px}}
{n} .pill{{font-family:'Space Grotesk';font-weight:600;font-size:13px;border:3px solid var(--ink);background:#fff;padding:7px 14px;border-radius:999px;box-shadow:3px 3px 0 var(--ink)}}
{n} .pill.blue{{background:var(--blue);color:#fff}}
{n} .pill.neon{{background:var(--neon);color:var(--ink)}}
{n} .pill.dark{{background:var(--ink);color:#fff}}

{n} .grid2{{display:grid;grid-template-columns:1fr 1fr;gap:26px;margin-top:30px}}
{n} .grid2 .shot{{margin-top:0}}
{n} .cap{{font-family:'Space Grotesk';font-weight:600;font-size:14px;margin-top:12px}}
{n} .cap span{{color:#777;font-weight:400}}

{n} .callout{{border:var(--line);background:var(--ink);color:var(--paper);box-shadow:10px 10px 0 var(--neon);padding:30px 28px;margin-top:30px;font-family:'Space Grotesk';font-weight:500;font-size:clamp(18px,2.4vw,24px);line-height:1.35;border-radius:6px}}
{n} .callout b{{font-weight:700;color:var(--neon)}}

{n} .stack{{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px;margin-top:30px}}
{n} .stack .card{{border:var(--line);background:#fff;padding:22px;box-shadow:var(--shadow-sm);border-radius:6px}}
{n} .stack .card h4{{font-size:17px;margin-bottom:6px}}
{n} .stack .card p{{margin-top:4px;font-size:14.5px;color:#444}}

{n} .closing{{background:var(--ink);color:var(--paper);border:var(--line);border-radius:18px;box-shadow:10px 10px 0 var(--neon);margin-top:36px;padding:44px 0}}
{n} .closing .wrap{{padding:0 28px}}
{n} .closing h2{{color:var(--paper)}}
{n} .closing .callout{{margin-top:0}}
{n} .stat-row{{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));border:4px solid var(--paper);margin-top:36px;border-radius:6px;overflow:hidden}}
{n} .stat-row div{{padding:26px 20px;border-right:3px solid var(--paper)}}
{n} .stat-row div:last-child{{border-right:none}}
{n} .stat-row b{{font-family:'Space Grotesk';font-size:34px;font-weight:700;display:block;color:var(--neon);line-height:1.1}}
{n} .stat-row small{{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#cfcfcf}}
{n} .cta{{display:inline-block;margin-top:32px;font-family:'Space Grotesk';font-weight:700;font-size:17px;background:var(--neon);color:var(--ink);border:4px solid var(--paper);padding:16px 28px;box-shadow:8px 8px 0 var(--blue);text-decoration:none;border-radius:6px}}

{n} .foot{{background:var(--ink);color:#9a9a9a;border-radius:14px;font-size:13px;font-family:'Space Grotesk';margin-top:20px}}
{n} .foot .wrap{{padding:22px 24px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;max-width:100%}}
{n} .foot a{{color:var(--neon);text-decoration:none}}

/* ---- esquemas / diagramas ---- */
{n} .diagram{{border:var(--line);box-shadow:var(--shadow);background:#fff;border-radius:6px;margin-top:30px;padding:28px 24px;overflow-x:auto}}
{n} .diagram svg{{display:block;width:100%;height:auto;max-width:100%}}
{n} .dcap{{font-family:'Space Grotesk';font-weight:600;font-size:14px;margin-top:12px;color:#444}}
{n} .note{{border-left:6px solid var(--neon);background:var(--paper-2);padding:16px 20px;margin-top:24px;font-size:15.5px}}
{n} .note b{{font-weight:700}}
{n} table.t{{width:100%;border-collapse:collapse;margin-top:26px;border:var(--line);box-shadow:var(--shadow);background:#fff;font-size:14.5px}}
{n} table.t th{{background:var(--ink);color:var(--paper);font-family:'Space Grotesk';font-size:12px;letter-spacing:.1em;text-transform:uppercase;padding:12px 14px;text-align:left}}
{n} table.t td{{padding:12px 14px;border-top:2px solid var(--ink);vertical-align:top}}
{n} table.t tr td:first-child{{font-family:'Space Grotesk';font-weight:600}}

@media(max-width:760px){{{n} .grid2{{grid-template-columns:1fr}}}}
@media(max-width:720px){{
  {n} .meta div,{n} .stat-row div{{border-right:none;border-bottom:3px solid var(--ink)}}
  {n} .stat-row div{{border-bottom:3px solid var(--paper)}}
  {n} .meta div:last-child,{n} .stat-row div:last-child{{border-bottom:none}}
}}
"""
