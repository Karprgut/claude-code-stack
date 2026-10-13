# -*- coding: utf-8 -*-
import sys, os, json, glob, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import shop
shop.usar_app_archivos()   # la app SHOPIFY_KCL_* es la única con permiso de subir archivos

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PKS = ["adglow-sitio","adglow-brief","adglow-estrategia","fabiola-rivera",
       "adglow-reporting","flint","prisma"]          # rcn y panorama no llevan imágenes
MAPA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mapa-imagenes.json")
mapa = json.load(open(MAPA)) if os.path.exists(MAPA) else {}

ids = {}
for pk in PKS:
    d = os.path.join(BASE, pk+"-case-study", "screenshots-web")
    mapa.setdefault(pk, {})
    for f in sorted(glob.glob(os.path.join(d, "*.jpg"))):
        nom = os.path.basename(f)
        if nom in mapa[pk]:
            print(f"  ya estaba  {pk}/{nom}"); continue
        destino = f"kcl-{pk}--{nom}"
        try:
            fid = shop.subir(f, destino, alt=f"{pk} · {nom}")
            ids[fid] = (pk, nom)
            print(f"  subido     {pk}/{nom}")
        except Exception as e:
            print(f"  FALLÓ      {pk}/{nom}: {str(e)[:150]}")
        time.sleep(0.25)

if ids:
    print("\nEsperando a que Shopify procese…")
    urls = shop.url_de(list(ids))
    for fid,(pk,nom) in ids.items():
        if fid in urls: mapa[pk][nom] = urls[fid]
        else: print(f"  SIN URL    {pk}/{nom}")
json.dump(mapa, open(MAPA,"w"), indent=1, ensure_ascii=False)
tot = sum(len(v) for v in mapa.values())
print(f"\nmapa: {tot} imágenes con URL de CDN")
for pk in PKS:
    d = os.path.join(BASE, pk+"-case-study", "screenshots-web")
    n_disco = len(glob.glob(os.path.join(d,"*.jpg")))
    print(f"  {pk:20s} {len(mapa.get(pk,{})):2d}/{n_disco}")
