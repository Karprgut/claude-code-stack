# -*- coding: utf-8 -*-
import sys, os, json, base64, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import shop

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # la carpeta que contiene los <paquete>-case-study/
PORT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "portadas")  # PNG de portada por paquete
BLOG = <BLOG_ID>
ESTADO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "publicados.json")

META = {
 "adglow-sitio":     ("CASO · ADGLOW — el sitio como producto", "caso-adglow-sitio",
   "Cómo se construyó adglow.mx: una sola base de Next.js para la narrativa de marca y para los cuatro productos que viven dentro."),
 "adglow-brief":     ("CASO · EL BRIEF — de correo suelto a pipeline", "caso-adglow-brief-pipeline",
   "Un brief estructurado en cuatro pasos que al enviarse dispara el plan inicial, las preguntas al cliente y el borrador de deck."),
 "adglow-estrategia":("CASO · ESTRATEGIA INMEDIATA — un plan de medios en ocho preguntas", "caso-estrategia-inmediata",
   "Motor de reglas determinista para la aritmética, criterio humano encima: preview gratis y estrategia completa cobrada."),
 "fabiola-rivera":   ("CASO · FABIOLA RIVERA — el portafolio de una muralista", "caso-fabiola-rivera-portafolio",
   "Un tema de Shopify escrito a la medida donde la obra manda y la tienda es una función más, no el centro."),
 "rcn-spectrum":     ("CASO · SPECTRUM — 5.3 millones de audiencias sin tocar un dato personal", "caso-spectrum-rcn",
   "Arquitectura de activación de audiencias first-party: medallón sobre Databricks y el hash en el borde, no en el destino."),
 "panorama-brain":   ("CASO · PANORAMA BRAIN — memoria institucional que no se degrada", "caso-panorama-brain",
   "Sistema de conocimiento consultable: los hechos los genera la máquina, el sentido lo escriben las personas."),
 "adglow-reporting": ("CASO · REPORTING — un reporte por cliente, y el margen del otro lado", "caso-reporting-paid-media",
   "Ingesta directa de Meta, Google y TikTok, acceso por cliente, pacing contra plan de medios y gestión de margen por dentro."),
 "flint":            ("CASO · FLINT — el centro de mando que reemplazó quince hojas", "caso-flint-centro-de-mando",
   "Tablero web, app de iOS y agente de terminal sobre una sola base: campañas, operación, personas y salud."),
 "prisma":           ("CASO · PRISMA — inteligencia competitiva sin panel", "caso-prisma-inteligencia",
   "Sin panel no se observan impresiones, se observa presencia. Un modelo que declara en cada fila qué mide y qué estima."),
}
TAGS = "caso de éxito, portafolio, Karma Creative Lab"

def cuerpo(pk, mapa=None):
    html = open(os.path.join(BASE, pk+"-case-study", "shopify-article.html")).read()
    if "__CDNBASE__" in html:
        if not mapa: raise RuntimeError(f"{pk}: faltan URLs de CDN")
        def sub(m):
            nom = m.group(1)
            if nom not in mapa: raise RuntimeError(f"{pk}: sin URL para {nom}")
            return mapa[nom]
        html = re.sub(r'__CDNBASE__/([A-Za-z0-9._-]+)', sub, html)
    assert "__CDNBASE__" not in html
    return html

def portada(pk):
    p = os.path.join(PORT, pk+".jpg")
    return base64.b64encode(open(p,"rb").read()).decode()

def publicar(pk, mapa=None):
    titulo, handle, resumen = META[pk]
    art = {"title": titulo, "handle": handle, "author": "Karma Creative Lab",
           "body_html": cuerpo(pk, mapa), "summary_html": f"<p>{resumen}</p>",
           "tags": TAGS, "published": True,
           "image": {"attachment": portada(pk), "alt": titulo}}
    est = json.load(open(ESTADO)) if os.path.exists(ESTADO) else {}
    if pk in est:
        r = shop.rest("PUT", f"/blogs/{BLOG}/articles/{est[pk]}.json", {"article": art})
        accion = "actualizado"
    else:
        r = shop.rest("POST", f"/blogs/{BLOG}/articles.json", {"article": art})
        accion = "creado"
    a = r["article"]
    est[pk] = a["id"]
    json.dump(est, open(ESTADO,"w"), indent=1)
    return accion, a

if __name__ == "__main__":
    mapa_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mapa-imagenes.json")
    mapa_all = json.load(open(mapa_path)) if os.path.exists(mapa_path) else {}
    for pk in sys.argv[1:]:
        try:
            accion, a = publicar(pk, mapa_all.get(pk))
            img = "CON portada" if a.get("image") else "SIN PORTADA"
            print(f"  {accion:12s} {pk:18s} id={a['id']} {img}  /blogs/news/{a['handle']}")
        except Exception as e:
            print(f"  FALLÓ        {pk:18s} {str(e)[:220]}")
