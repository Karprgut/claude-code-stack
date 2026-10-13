# -*- coding: utf-8 -*-
"""Genera preview.html (autocontenido) + shopify-article.html (fragmento) de un case study."""
import html as _h, os, sys
from css import css, FONTS

def esc(s): return _h.escape(s, quote=False)

def _img(src, web):  # web=True -> preview local; False -> Shopify CDN
    return f"screenshots-web/{src}" if web else f"__CDNBASE__/{src}"

def _shot(s, web, ns):
    cls = "shot tall" if s.get("tall") else "shot"
    url = esc(s.get("url", ""))
    bar = (f'<div class="bar"><span class="dot d1"></span><span class="dot d2"></span>'
           f'<span class="dot d3"></span><span class="url">{url}</span></div>') if url else ""
    out = (f'<div class="{cls}">{bar}<img src="{_img(s["img"], web)}" alt="{esc(s.get("alt",""))}" '
           f'loading="lazy"></div>')
    if s.get("cap"):
        sub = f' <span>· {esc(s["capsub"])}</span>' if s.get("capsub") else ""
        out += f'<p class="cap">{esc(s["cap"])}{sub}</p>'
    return out

def render(sec, web, ns):
    t = sec["t"]
    if t == "hero":
        h1 = "<br>".join(sec["h1"])
        meta = "".join(f'<div><dt>{esc(a)}</dt><dd>{b}</dd></div>' for a, b in sec.get("meta", []))
        return (f'<div class="hero"><div class="wrap">'
                f'<span class="eyebrow">{esc(sec["eyebrow"])}</span>'
                f'<h1>{h1}</h1><p class="dek">{sec["dek"]}</p>'
                + (f'<dl class="meta">{meta}</dl>' if meta else "") + '</div></div>')
    if t == "sec":
        head = ""
        if sec.get("num") or sec.get("h2"):
            num = f'<div class="sec-num">{sec["num"]}</div>' if sec.get("num") else ""
            head = f'<div class="sec-head">{num}<h2>{sec["h2"]}</h2></div>'
        body = f'<p class="lead">{sec["lead"]}</p>' if sec.get("lead") else ""
        body += "".join(f"<p>{p}</p>" for p in sec.get("ps", []))
        inner = "".join(render(c, web, ns) for c in sec.get("children", []))
        narrow = " body-narrow" if sec.get("narrow") else ""
        pad = f' style="{sec["style"]}"' if sec.get("style") else ""
        return f'<section{pad}><div class="wrap{narrow}">{head}{body}{inner}</div></section>'
    if t == "shot":   return _shot(sec, web, ns)
    if t == "shots2":
        cells = "".join(f'<div>{_shot(i, web, ns)}</div>' for i in sec["items"])
        return f'<div class="grid2">{cells}</div>'
    if t == "pills":
        return '<div class="pills">' + "".join(
            f'<span class="pill {k}">{v}</span>' for k, v in sec["items"]) + '</div>'
    if t == "cards":
        return '<div class="stack">' + "".join(
            f'<div class="card"><h4>{h}</h4><p>{p}</p></div>' for h, p in sec["items"]) + '</div>'
    if t == "callout": return f'<div class="callout">{sec["html"]}</div>'
    if t == "note":    return f'<div class="note">{sec["html"]}</div>'
    if t == "diagram":
        cap = f'<p class="dcap">{sec["cap"]}</p>' if sec.get("cap") else ""
        return f'<div class="diagram">{sec["svg"]}</div>{cap}'
    if t == "table":
        th = "".join(f"<th>{c}</th>" for c in sec["head"])
        rows = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in sec["rows"])
        return f'<table class="t"><thead><tr>{th}</tr></thead><tbody>{rows}</tbody></table>'
    if t == "divider": return '<div class="divider"></div>'
    if t == "closing":
        stats = "".join(f'<div><b>{a}</b><small>{b}</small></div>' for a, b in sec.get("stats", []))
        cta = ""
        if sec.get("cta"):
            txt, href = sec["cta"]
            cta = f'<a class="cta" href="{href}" target="_blank" rel="noopener">{txt} →</a>'
        return (f'<section class="closing"><div class="wrap">'
                f'<div class="callout">{sec["callout"]}</div>'
                + (f'<div class="stat-row">{stats}</div>' if stats else "") + cta + '</div></section>')
    raise ValueError("tipo desconocido: " + t)

def build(cfg):
    ns = cfg["ns"]
    body = "".join(render(s, True, ns) for s in cfg["sections"])
    body_cdn = "".join(render(s, False, ns) for s in cfg["sections"])
    mast = ('<header class="masthead"><div class="wrap">'
            '<div class="kcl-mark">KARMA<span>·</span>CREATIVE<span>·</span>LAB</div>'
            f'<div class="tag">{cfg.get("tag","Case Study")}</div></div></header>')
    foot = ('<div class="foot"><div class="wrap">'
            '<span>© Karma Creative Lab · <a href="https://kmco.io">kmco.io</a></span>'
            f'<span>{cfg["footright"]}</span></div></div>')
    sheet = css(ns, cfg.get("accent", "#39FF14"), cfg.get("accent2", "#2D5BFF"))

    shopify = (f"<!-- Case study: {cfg['title']} · Karma Creative Lab -->\n"
               f"<style>{sheet}</style>\n\n"
               f'<div class="{ns}">\n{mast}\n{body_cdn}\n{foot}\n</div>\n')

    preview = f"""<!DOCTYPE html>
<html lang="es-MX">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{esc(cfg['title'])} · Case Study KCL</title>
<meta name="description" content="{esc(cfg.get('desc',''))}">
<style>
  *{{margin:0;padding:0}}
  body{{background:#F2F2F2;padding:28px 18px 60px}}
  .page{{max-width:1000px;margin:0 auto}}
{sheet}
</style>
</head>
<body><div class="page"><div class="{ns}">
{mast}
{body}
{foot}
</div></div></body>
</html>
"""
    return preview, shopify

def write(cfg, outdir):
    os.makedirs(outdir, exist_ok=True)
    p, s = build(cfg)
    open(os.path.join(outdir, "preview.html"), "w").write(p)
    open(os.path.join(outdir, "shopify-article.html"), "w").write(s)
    return len(p), len(s)
