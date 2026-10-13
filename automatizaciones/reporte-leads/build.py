#!/usr/bin/env python3
"""Reporte diario de leads de TBP.

Trae los leads (contactos) y los deals de Brevo CRM + el gasto de Meta Ads,
y escribe un HTML autocontenido con el mes en curso y su comparativa contra
el mes anterior.

Se llama por API directa con credencial, nunca por MCP: una rutina desatendida
que llama un conector MCP se cuelga en silencio.

    python3 build.py [--mes 2026-09] [--out out/leads-tbp.html]
"""

import argparse
import datetime as dt
import html
import re
import json
import os
import pathlib
import sys
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent
ASSETS = ROOT / "assets"
ENV_FILE = pathlib.Path.home() / ".config" / "tbp-leads" / "env"

BREVO = "https://api.brevo.com/v3"
GRAPH = "https://graph.facebook.com/v21.0"

# Los cuatro tiers de servicio de TBP. CATEGORY es el valor que manda el form.
TIERS = {"1": "Sprint", "2": "Core", "3": "Deep", "4": "B. App"}
PIPELINES = {
    "<PIPELINE_ID_1>": "Sprint",
    "<PIPELINE_ID_2>": "Core",
    "<PIPELINE_ID_3>": "Deep",
    "<PIPELINE_ID_4>": "B. App",
}

MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
         "agosto", "septiembre", "octubre", "noviembre", "diciembre"]

# Respuestas de opción múltiple del instant form: dicen la intención, no el proyecto.
OPCIONES_FORM = {
    "marketing strategy", "visual identity", "rebranding", "new brand launch",
    "scale my business", "enhance marketing", "grow online presence",
    "brand applications", "packaging", "web design",
}


# ─── credenciales ─────────────────────────────────────────────────────

def load_env():
    if not ENV_FILE.exists():
        sys.exit(f"falta {ENV_FILE} — copia env.example y llena las llaves")
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())


def get(url, headers, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read())
        except Exception as e:  # noqa: BLE001 — reintenta y si no, revienta con contexto
            if i == tries - 1:
                raise RuntimeError(f"falló {url.split('?')[0]}: {e}") from e
    return None


# ─── Brevo ────────────────────────────────────────────────────────────

def brevo_all(path, key, page=100, cap=2000):
    """Pagina descendente; corta en cuanto la página vuelve vacía."""
    hdr = {"api-key": key, "accept": "application/json"}
    out, off = [], 0
    while off < cap:
        d = get(f"{BREVO}/{path}{'&' if '?' in path else '?'}limit={page}&offset={off}&sort=desc", hdr)
        chunk = d.get("contacts") or d.get("items") or []
        if not chunk:
            break
        out += chunk
        off += page
    return out


def fetch_brevo(key, mes):
    contactos = brevo_all("contacts", key)
    deals = brevo_all("crm/deals", key)
    stages = {}
    for p in get(f"{BREVO}/crm/pipeline/details/all", {"api-key": key, "accept": "application/json"}):
        for s in p.get("stages", []):
            stages[s["id"]] = s["name"]
    return contactos, deals, stages


# ─── Meta ─────────────────────────────────────────────────────────────

def fetch_meta(token, account, since, until):
    fields = "spend,impressions,reach,frequency,cpm,ctr,actions,cost_per_action_type"
    tr = urllib.parse.quote(json.dumps({"since": since, "until": until}))
    d = get(f"{GRAPH}/{account}/insights?level=account&time_range={tr}"
            f"&fields={fields}&access_token={token}", {})
    rows = d.get("data") or []
    if not rows:
        return {"spend": 0.0, "leads": 0, "cpl": None, "cpm": None, "freq": None}
    r = rows[0]
    leads = next((int(a["value"]) for a in r.get("actions", []) if a["action_type"] == "lead"), 0)
    spend = float(r.get("spend", 0))
    return {
        "spend": spend,
        "leads": leads,
        "cpl": spend / leads if leads else None,
        "cpm": float(r["cpm"]) if r.get("cpm") else None,
        "freq": float(r["frequency"]) if r.get("frequency") else None,
    }


def fetch_meta_ads(token, account, since, until):
    """Gasto y leads por anuncio — para ver qué arte está cargando el mes."""
    tr = urllib.parse.quote(json.dumps({"since": since, "until": until}))
    d = get(f"{GRAPH}/{account}/insights?level=ad&time_range={tr}"
            f"&fields=ad_name,spend,actions&limit=200&access_token={token}", {})
    agg = {}
    for r in d.get("data", []):
        name = r["ad_name"]
        leads = next((int(a["value"]) for a in r.get("actions", []) if a["action_type"] == "lead"), 0)
        cur = agg.setdefault(name, {"spend": 0.0, "leads": 0})
        cur["spend"] += float(r.get("spend", 0))
        cur["leads"] += leads
    return sorted(
        ({"name": k, **v} for k, v in agg.items()),
        key=lambda x: -x["spend"],
    )


# ─── clasificación ────────────────────────────────────────────────────

# Los leads pegan emoji y monólogos de WhatsApp. La marca no admite emoji en
# ninguna superficie, y un párrafo de 600 caracteres rompe el ritmo de la tabla.
EMOJI = re.compile(
    "[\U0001F000-\U0001FAFF\U00002600-\U000027BF\U0001F1E6-\U0001F1FF"
    "\U00002190-\U000021FF\U00002300-\U000023FF\uFE0F\u2764]+")


def limpia(texto, limite=105):
    t = EMOJI.sub("", str(texto))
    t = " ".join(t.split())
    if len(t) > limite:
        corte = t[:limite].rsplit(" ", 1)[0]
        t = corte + "…"
    return t


def fuente(attrs):
    lp = attrs.get("LANDING_PAGE", "")
    if "utm_source=google" in lp or attrs.get("REFERRER", "").startswith("https://www.google."):
        return "Google"
    if attrs.get("AD_NAME") or attrs.get("FORM_ID"):
        return "Meta"
    if lp or attrs.get("GA_CLIENT_ID"):
        return "Webform"
    return "Webform"


# El referrer del propio sitio es navegación interna, no un referido.
PROPIOS = ("tbp.studio", "thebrandingpeople.com")


def _ref_limpio(url):
    """Host + ruta del referrer. Sin query: ahí vive el _gl de GA, que es ruido."""
    try:
        u = urllib.parse.urlsplit(str(url))
    except ValueError:
        return ""
    host = (u.hostname or "").lower()
    if host.startswith("www."):
        host = host[4:]
    if not host:
        return ""
    return f"{host}{(u.path or '').rstrip('/')}"[:46]


def _ts_fb(v):
    """Las cookies de Meta son fb.1.<ms>.<id>: el ms es cuándo se creó.

    _fbc nace con el clic en el anuncio; _fbp con la primera visita al sitio.
    """
    try:
        return dt.datetime.fromtimestamp(int(str(v).split(".")[2]) / 1000)
    except (IndexError, ValueError, TypeError, OSError):
        return None


def _ts_ga(v):
    """El client id de GA4 es <random>.<epoch>: el epoch es la PRIMERA visita."""
    try:
        return dt.datetime.fromtimestamp(int(str(v).split(".")[1]))
    except (IndexError, ValueError, TypeError, OSError):
        return None


# Margen para considerar que dos rastros son el mismo momento: el clic en el
# anuncio y la primera visita al sitio nunca caen en el mismo segundo exacto.
MISMO_MOMENTO = dt.timedelta(hours=2)


def atribucion(a, registro):
    """Atribuye al canal del PRIMER contacto, no al último.

    Junta cada rastro que dejó el formulario con el momento en que ocurrió y se
    queda con el más temprano; los demás canales quedan como asistencias. Las
    conversiones asistidas no cambian el canal, solo se anotan.

    Los rastros y lo que valen:
      · FORM_ID / AD_NAME sin landing → el lead form de Meta: el contacto pasó
        dentro de la app, sin navegador de por medio.
      · FBC   → clic en un anuncio de Meta, con su hora exacta.
      · UTM / gclid → la sesión en la que llenó el formulario.
      · GA client id y FBP → cuándo pisó el sitio por primera vez. Si son muy
        anteriores al primer rastro de campaña, hubo un contacto previo que no
        podemos nombrar, y decirlo es más honesto que colgárselo a la campaña.
    """
    lp = str(a.get("LANDING_PAGE", ""))
    utm = str(a.get("UTM_SOURCE", "")).lower()
    fbc = _ts_fb(a.get("FBC"))
    primera_visita = min([t for t in (_ts_ga(a.get("GA_CLIENT_ID")), _ts_fb(a.get("FBP"))) if t],
                         default=None)

    señales = []  # (momento, canal, detalle)

    if a.get("FORM_ID") or (a.get("AD_NAME") and not lp):
        señales.append((registro, "Meta", a.get("AD_NAME") or "lead form"))
    if fbc:
        señales.append((fbc, "Meta", "clic en anuncio, luego el sitio"))
    if utm == "google" or "gclid=" in lp:
        detalle = " · ".join(x for x in (a.get("UTM_CAMPAIGN"), a.get("UTM_CONTENT"),
                                         a.get("UTM_TERM")) if x) or "búsqueda pagada"
        señales.append((primera_visita or registro, "Google Ads", detalle))
    elif utm:
        señales.append((primera_visita or registro, utm.title(),
                        str(a.get("UTM_CAMPAIGN", "")) or "con utm"))
    elif str(a.get("REFERRER", "")).startswith("http") and not señales:
        # Un referrer de tbp.studio es alguien que ya andaba en el sitio: no es
        # un referido. Sin señal, cae a Directo, que es lo que de verdad fue.
        ref = _ref_limpio(a["REFERRER"])
        if ref and not ref.startswith(PROPIOS):
            señales.append((primera_visita or registro, "Referido", ref))

    señales.sort(key=lambda x: x[0])

    if not señales:
        interno = _ref_limpio(a.get("REFERRER", ""))
        if interno.startswith(PROPIOS):
            ruta = interno.split("/", 1)
            return {"canal": "Directo",
                    "detalle": ("venía navegando el sitio, desde /" + ruta[1]
                                if len(ruta) > 1 and ruta[1] else "venía navegando el sitio"),
                    "paid": False, "cuando": primera_visita, "asistencias": [],
                    "certeza": "alta"}
        if primera_visita and registro - primera_visita > MISMO_MOMENTO:
            return {"canal": "Directo", "detalle": "ya había visitado el sitio antes",
                    "paid": False, "cuando": primera_visita, "asistencias": [],
                    "certeza": "media"}
        return {"canal": "Directo", "detalle": "llegó por su cuenta, sin rastro de campaña",
                "paid": False, "cuando": None, "asistencias": [], "certeza": "alta"}

    momento, canal, detalle = señales[0]
    asistencias = [c for _, c, _ in señales[1:] if c != canal]

    # ¿Pisó el sitio antes de cualquier campaña que sepamos leer?
    if primera_visita and momento - primera_visita > MISMO_MOMENTO:
        return {"canal": "Sin identificar",
                "detalle": f"primera visita antes de la campaña; {canal.lower()} asistió",
                "paid": False, "cuando": primera_visita,
                "asistencias": [canal] + asistencias, "certeza": "media"}

    return {"canal": canal, "detalle": detalle,
            "paid": canal in ("Meta", "Google Ads") or canal.lower() in ("facebook", "instagram"),
            "cuando": momento if momento != registro else None,
            "asistencias": asistencias, "certeza": "alta"}


def es_prueba(c):
    a = c.get("attributes", {})
    return (a.get("UTM_CAMPAIGN") == "verify_setup"
            or "tu-dominio.com" in (c.get("email") or "")
            or str(a.get("TELL_US_ABOUT", "")).strip().lower() in {"test", "prueba"})


# Ruido conversacional: textos largos que no dicen nada de un proyecto.
# Sin esto, un "felicitaciones y muchas bendiciones amén" pasa por lead bueno
# solo porque es largo.
CHARLA = ("buenos dias", "buenos días", "buenas tardes", "buenas noches", "como estas",
          "cómo estás", "bendicion", "bendición", "amén", "amen ", "felicitaciones",
          "saludos cordiales", "gracias por", "hola amigo", "que tal")
BASURA = ("sexo", " sex", "sex ", "cama", "predator", "facebook.com/", "whatsapp.com")


def calidad(c):
    """Clasificación automática, sujeta a revisión editorial.

    Se apoya en lo único que el lead escribió con sus manos: TELL_US_ABOUT.
    """
    a = c.get("attributes", {})
    t = EMOJI.sub("", str(a.get("TELL_US_ABOUT", ""))).strip()
    low = t.lower()
    nombre = f"{a.get('NOMBRE','')} {a.get('APELLIDOS','')}".strip().lower()

    if not t:
        # El instant form de septiembre no tiene campo abierto: el lead no calló,
        # nunca le preguntaron. No es lo mismo que spam.
        return "Sin señal" if (a.get("FORM_ID") or a.get("AD_NAME")) else "Baja"
    if any(w in low for w in BASURA):
        return "Spam"
    if low in OPCIONES_FORM:
        return "Media"  # eligió una opción del menú, no escribió nada propio
    if len(t) < 4:
        return "Spam"
    if low.replace(" ", "") in nombre.replace(" ", ""):
        return "Spam"  # escribió su propio nombre en el campo de proyecto
    if t.replace(" ", "").replace("-", "").replace("+", "").isdigit():
        return "Spam"  # dejó un teléfono
    if "http" in low and len(t) < 80:
        return "Spam"
    if any(w in low for w in CHARLA):
        return "Spam"  # saludo o cadena de bendiciones, no un brief
    if len(t) >= 120:
        return "Muy buena"
    if len(t) >= 45:
        return "Buena"
    if len(t) >= 12:
        return "Media"
    return "Baja"


CON_POTENCIAL = {"Muy buena", "Buena"}

# Orden de lectura de la tabla: primero a quién hay que llamar.
ORDEN_CALIDAD = ["Muy buena", "Buena", "Media", "Baja", "Sin señal", "Spam"]


# ─── armado del mes ───────────────────────────────────────────────────

def mes_bounds(mes, hoy):
    y, m = (int(x) for x in mes.split("-"))
    ini = dt.date(y, m, 1)
    fin = dt.date(y + (m == 12), (m % 12) + 1, 1) - dt.timedelta(days=1)
    return ini, min(fin, hoy)


def prev_mes(mes):
    y, m = (int(x) for x in mes.split("-"))
    return f"{y - (m == 1)}-{12 if m == 1 else m - 1:02d}"


def leads_del_mes(contactos, mes):
    out = []
    for c in contactos:
        if (c.get("createdAt") or "")[:7] != mes:
            continue
        a = c.get("attributes", {})
        out.append({
            "attr": atribucion(a, dt.datetime.fromisoformat(c["createdAt"][:19])),
            "dia": c["createdAt"][8:10],
            "fecha": c["createdAt"][:10],
            "nombre": (a.get("NOMBRE") or c.get("email", "")).strip(),
            "email": c.get("email", ""),
            "proyecto": str(a.get("TELL_US_ABOUT", "")).strip(),
            "tier": TIERS.get(str(a.get("CATEGORY", "")), "—"),
            "fuente": fuente(a),
            "ad": a.get("AD_NAME", ""),
            "calidad": calidad(c),
            "prueba": es_prueba(c),
        })
    out.sort(key=lambda x: (x["fecha"], x["nombre"]))
    return out


def deals_del_mes(deals, stages, mes):
    out = []
    for d in deals:
        a = d.get("attributes", {})
        if (a.get("created_at") or "")[:7] != mes:
            continue
        out.append({
            "fecha": a["created_at"][:10],
            "nombre": a.get("deal_name", ""),
            "pipeline": PIPELINES.get(a.get("pipeline"), "?"),
            "categoria": TIERS.get({"sprint": "1", "core": "2", "deep": "3",
                                    "brand_applications": "4"}.get(a.get("category"), ""), "—"),
            "etapa": stages.get(a.get("deal_stage"), "—"),
            "contactos": a.get("number_of_contacts", 0),
            # El form no pregunta cómo se llama la marca: cuando se sabe, el
            # equipo lo escribe en las notas del deal.
            "notas": (a.get("notas") or "").strip(),
            "movido": a.get("stage_updated_at", "")[:10] != a.get("created_at", "")[:10],
        })
    out.sort(key=lambda x: x["fecha"])
    return out


def señales(leads, deals, ads, meta, meta_prev):
    """Hechos que el reporte debe gritar. Reglas, no opinión."""
    s = []

    # 1. El bug de Brand Applications: categoría y pipeline no coinciden.
    mal = [d for d in deals if d["categoria"] != "—" and d["categoria"] != d["pipeline"]]
    if mal:
        nombres = sorted({min(claves_deal(d["nombre"]), key=len).title() for d in mal})
        s.append(("urgent", "El bug de pipeline sigue vivo",
                  f"{len(mal)} deals del mes cayeron en un pipeline que no es el de su tier "
                  f"({', '.join(nombres)}). "
                  "Mientras no se arregle, el tablero de cada tier miente."))

    # 2. Nadie pasa de Seguimiento.
    avanzados = [d for d in deals if d["etapa"] not in ("First Contact", "Firtst Contact", "Seguimiento")]
    buenos = [l for l in leads if l["calidad"] in CON_POTENCIAL and not l["prueba"]]
    if not avanzados and buenos:
        s.append(("urgent", "Ningún deal pasó de Seguimiento",
                  f"Los {len(buenos)} leads con potencial real del mes siguen en las dos primeras "
                  "etapas: cero llamadas agendadas, cero cotizaciones enviadas. Trabajar esos leads "
                  "sigue siendo más barato que cualquier peso extra de pauta."))

    # 3. Qué arte está cargando el mes.
    # Los anuncios eng_* persiguen engagement, no leads: no cuentan como gasto fallido.
    capta = [a for a in ads if not a["name"].startswith("eng_")]
    if capta:
        top = capta[0]
        conleads = [a for a in capta if a["leads"] > 0]
        gasto_sin = sum(a["spend"] for a in capta if a["leads"] == 0)
        if top["leads"] and len(conleads) <= 3 and gasto_sin > top["spend"] * 0.2:
            s.append(("", "Un solo anuncio está trayendo los leads",
                      f"{top['name']} se llevó ${top['spend']:,.0f} y trajo {top['leads']} de los "
                      f"{meta['leads']} leads del mes. El resto de los anuncios de captación suman "
                      f"${gasto_sin:,.0f} sin un solo lead: los artes nuevos todavía no compran nada."))

    # 4. Deals sin contacto vinculado.
    sin = [d for d in deals if not d["contactos"]]
    if len(sin) > len(deals) * 0.5 and deals:
        s.append(("", "Los deals siguen sin contacto vinculado",
                  f"{len(sin)} de {len(deals)} deals del mes no tienen ni un contacto ligado. "
                  "El deal existe, pero desde el CRM no se puede escribir ni llamar sin ir a buscar "
                  "el correo a mano."))

    # 5. Salud del trackeo: si el webform deja de mandar su client id, la
    #    atribución de first touch se cae en silencio.
    web = [l for l in leads if l["fuente"] != "Meta" and not l["prueba"]]
    ciegos = [l for l in web if l["attr"]["canal"] == "Directo"
              and "sin rastro" in l["attr"]["detalle"]]
    if web and len(ciegos) == len(web) and len(web) >= 3:
        s.append(("urgent", "El webform no está mandando atribución",
                  f"Los {len(web)} registros del webform llegaron sin client id de GA, sin "
                  "click id de Meta y sin utms. Antes sí llegaban: algo se rompió en el "
                  "tracking del sitio y mientras siga así no se puede saber qué campaña los trajo."))
    elif len(ciegos) > len(web) * 0.6 and len(web) >= 3:
        s.append(("", "Atribución incompleta en el webform",
                  f"{len(ciegos)} de {len(web)} registros del webform no traen ningún rastro "
                  "de origen. Vale revisar que el script de tracking siga corriendo en todas "
                  "las páginas del formulario."))

    # 6. Costo por lead contra el mes anterior.
    if meta["cpl"] and meta_prev.get("cpl"):
        delta = (meta["cpl"] - meta_prev["cpl"]) / meta_prev["cpl"]
        if abs(delta) > 0.15:
            mejor = delta < 0
            s.append(("", f"El costo por lead {'bajó' if mejor else 'subió'} {abs(delta) * 100:.0f}%",
                      f"${meta['cpl']:,.0f} este mes contra ${meta_prev['cpl']:,.0f} el anterior, "
                      f"con frecuencia de {meta['freq']:.2f} y CPM de ${meta['cpm']:,.0f}. "
                      + ("El problema del mes no es el costo, es qué llega por ese precio."
                         if mejor else "Vale revisar saturación de audiencia antes de subir presupuesto.")))
    return s


# ─── render ───────────────────────────────────────────────────────────

def e(x):
    return html.escape(str(x), quote=True)


CHIP = {"Deep": "t-deep", "Core": "t-core", "Sprint": "t-sprint", "B. App": "t-ba", "—": "t-ba"}
QCLS = {"Muy buena": "q-buena", "Buena": "q-buena", "Media": "q-media",
        "Baja": "q-baja", "Spam": "q-spam", "Sin señal": "q-nodata"}


def norm(s):
    return " ".join(str(s).lower().split())


def claves_deal(deal_name):
    """Brevo nombra los deals "<Nombre> <Nombre> - <Tier>": el nombre va duplicado
    y con el tier pegado. Devuelve las variantes con las que puede casar un lead."""
    base = norm(deal_name.rsplit(" - ", 1)[0] if " - " in deal_name else deal_name)
    claves = {base}
    palabras = base.split()
    # el nombre suele venir repetido dos veces: quédate con la primera mitad
    if len(palabras) % 2 == 0:
        mitad = len(palabras) // 2
        if palabras[:mitad] == palabras[mitad:]:
            claves.add(" ".join(palabras[:mitad]))
    for n in (1, 2, 3):
        if len(palabras) >= n:
            claves.add(" ".join(palabras[:n]))
    return claves


# El pipeline de Brand Applications tiene "Firtst Contact" con el typo adentro:
# es el CRM del cliente, así que hay que reconocer las dos grafías.
PRIMERA_ETAPA = ("First Contact", "Firtst Contact")
ETAPAS_TEMPRANAS = PRIMERA_ETAPA + ("Seguimiento",)
SIN_ETAPA = "—"


def mapa_deals(deals):
    """Índice nombre-de-lead → deal, armado con los deals del mes."""
    m = {}
    for d in deals:
        for k in claves_deal(d["nombre"]):
            m.setdefault(k, d)
    return m


def deal_de(nombre, mapa):
    nombre = norm(nombre)
    d = mapa.get(nombre)
    if not d:  # cae al nombre de pila + apellido
        partes = nombre.split()
        for n in (3, 2, 1):
            if len(partes) >= n and " ".join(partes[:n]) in mapa:
                d = mapa[" ".join(partes[:n])]
                break
    return d


def etapa_de(nombre, mapa):
    return (deal_de(nombre, mapa) or {}).get("etapa") or SIN_ETAPA


def carga_fuera_crm(mes):
    """Avances que el equipo reporta pero que nunca entraron a Brevo.

    Es un anexo a mano, NO una fuente: no entra en ningún conteo y va rotulado
    como tal en el reporte, para que nadie lo confunda con lo que dice el CRM.
    Formato de fuera-de-crm.json:
      [{"mes":"2026-09","marca":"INNR","quien":"","tier":"Sprint",
        "estado":"Ganada","nota":"...","reporto":"Javi"}]
    """
    f = ROOT / "fuera-de-crm.json"
    if not f.exists():
        return []
    try:
        datos = json.loads(f.read_text(encoding="utf8"))
    except (json.JSONDecodeError, OSError) as ex:
        print(f"aviso: {f.name} ilegible ({ex}); se ignora.", file=sys.stderr)
        return []
    return [d for d in datos if d.get("mes") == mes]


def seguimiento_previo(prev_leads, prev_deals, fuera_crm):
    """Qué fue de los leads que valían del mes pasado.

    El reporte rota el día 1 y los leads buenos del mes anterior se salían de la
    vista justo cuando empezaban a moverse en el CRM: un cierre de septiembre no
    aparecía en ninguna parte. Esto los sigue por nombre contra sus propios
    deals y dice quién cerró, quién avanzó y quién no se movió del arranque.
    """
    mapa = mapa_deals(prev_deals)
    out = []
    for l in sorted((x for x in prev_leads
                     if x["calidad"] in CON_POTENCIAL and not x["prueba"]),
                    key=lambda x: x["fecha"]):
        d = deal_de(l["nombre"], mapa) or {}
        etapa = d.get("etapa") or SIN_ETAPA
        if etapa == "Ganada":
            estado, avanzo = "Cerrada", True
        elif etapa == "Perdida":
            estado, avanzo = "Perdida", False
        elif etapa == SIN_ETAPA:
            estado, avanzo = "Sin deal", False
        else:
            estado, avanzo = etapa, etapa not in ETAPAS_TEMPRANAS
        # "Proyecto: Marfil · ..." → se muestra el nombre de la marca, que dice
        # más que las primeras palabras del brief.
        nota = d.get("notas") or limpia(l["proyecto"], 90)
        at = l["attr"]
        out.append({"quien": l["nombre"], "tier": l["tier"], "dia": l["dia"],
                    "estado": estado, "avanzo": avanzo, "nota": nota,
                    "cerrada": estado == "Cerrada", "crm": True, "reporto": "",
                    "canal": at["canal"], "origen": at["detalle"], "paid": at["paid"]})
    for x in fuera_crm:
        quien = " · ".join(v for v in (str(x.get("marca") or "").strip(),
                                       str(x.get("quien") or "").strip()) if v)
        estado = str(x.get("estado") or "—").strip()
        cerrada = estado in ("Ganada", "Cerrada")
        out.append({"quien": quien or "sin nombre", "tier": x.get("tier") or "—",
                    "dia": str(x.get("dia") or ""), "estado": "Cerrada" if cerrada else estado,
                    "avanzo": cerrada, "nota": str(x.get("nota") or ""),
                    "cerrada": cerrada, "crm": False,
                    "reporto": str(x.get("reporto") or ""),
                    "canal": str(x.get("canal") or "Sin dato"),
                    "origen": str(x.get("origen") or "no pasó por el CRM"),
                    "paid": bool(x.get("paid"))})
    return out


def fila(l, mapa, grupo=None):
    etapa = etapa_de(l["nombre"], mapa)
    # Un lead bueno parado en la primera etapa es el que hay que marcar. Antes se
    # miraba solo "First Contact", así que los de B. App se colaban sin bandera
    # por el typo del pipeline.
    clases = ["flag"] if (l["calidad"] in CON_POTENCIAL
                          and etapa in PRIMERA_ETAPA + (SIN_ETAPA,)) else []
    if grupo:
        clases.append("en-folder")
    flag = f' class="{" ".join(clases)}"' if clases else ""
    if grupo:
        flag += f' data-in="{grupo}" hidden'
    texto = limpia(l["proyecto"])
    proy = e(texto) if texto else '<span class="nada">sin descripción</span>'
    if texto and len(texto) < 40:
        proy = f"<q>{proy}</q>"
    at = l["attr"]
    src = "src-web" if at["paid"] else "src-meta"
    canal = (f'{e(at["canal"])}'
             f'<span class="det">{e(at["detalle"][:46])}</span>')
    if at["asistencias"]:
        canal += f'<span class="det">+ {e(", ".join(at["asistencias"]).lower())} asistió</span>'
    nodeal = " nodeal" if "flag" in clases else ""
    nombre = e(l["nombre"][:34])
    correo = l.get("email") or ""
    if correo:
        asunto = urllib.parse.quote(f'TBP · sobre tu proyecto')
        celda = (f'<a class="mail" href="mailto:{e(correo)}?subject={asunto}">{nombre}</a>'
                 f'<span class="mailaddr">{e(correo)}</span>')
    else:
        celda = nombre
    return (f'<tr{flag}><td class="d">{e(l["dia"])}</td>'
            f'<td class="lead">{celda}</td>'
            f'<td class="proy">{proy}</td>'
            f'<td><span class="chip {CHIP.get(l["tier"], "t-ba")}">{e(l["tier"])}</span></td>'
            f'<td class="{src}">{canal}</td>'
            f'<td class="st{nodeal}">{e(etapa)}</td>'
            f'<td><span class="q {QCLS.get(l["calidad"], "q-media")}">{e(l["calidad"])}</span></td></tr>')


def render(mes, hoy, leads, deals, ads, meta, meta_prev, prev_leads, sig,
           prev_deals=(), fuera_crm=()):
    """Viste el reporte con el sistema visual de TBP.

    Tokens y reglas salen del design system del cliente
    (propuestas/TBP/.../TBP Design System): vessel blue de fondo, crema para
    la tipografía, dos familias y nada más, chrome a radio 0, sin sombras,
    sin emoji.
    """
    y, m = (int(x) for x in mes.split("-"))
    titulo = f"{MESES[m - 1].capitalize()} {y}"
    pm = prev_mes(mes)
    titulo_prev = MESES[int(pm.split("-")[1]) - 1]

    reales = [l for l in leads if not l["prueba"]]
    pruebas = len(leads) - len(reales)
    buenos = [l for l in reales if l["calidad"] in CON_POTENCIAL]
    spam = [l for l in reales if l["calidad"] in ("Spam", "Sin señal")]
    web = [l for l in reales if l["fuente"] != "Meta"]
    prev_reales = [l for l in prev_leads if not l["prueba"]]
    prev_buenos = [l for l in prev_reales if l["calidad"] in CON_POTENCIAL]

    deals_por_nombre = mapa_deals(deals)

    def vs(previo):
        return f'<span class="vs">{previo} en {titulo_prev}</span>'

    cpl = f"${meta['cpl']:,.0f}" if meta["cpl"] else "—"
    cpl_prev = f"${meta_prev['cpl']:,.0f}" if meta_prev.get("cpl") else "—"

    kpis = f"""
    <div class="kpi"><div class="n">{len(reales)}</div>
      <div class="l">leads únicos<br>{vs(len(prev_reales))}</div></div>
    <div class="kpi"><div class="n">{len(buenos)}</div>
      <div class="l">con potencial real<br>{vs(len(prev_buenos))}</div></div>
    <div class="kpi"><div class="n">{len(spam)}</div>
      <div class="l">spam o sin señal<br><span class="vs">de {len(reales)} que llegaron</span></div></div>
    <div class="kpi"><div class="n">{len(reales) - len(web)}<small>/{len(web)}</small></div>
      <div class="l">meta / webform<br><span class="vs">el webform trae el mejor brief</span></div></div>
    <div class="kpi"><div class="n">{cpl}</div>
      <div class="l">costo por lead<br><span class="vs">{cpl_prev} en {titulo_prev} · ${meta['spend']:,.0f} invertidos</span></div></div>
    """

    # Por calidad, y dentro de cada grupo el que lleva más tiempo esperando.
    def clave(l):
        return (ORDEN_CALIDAD.index(l["calidad"]) if l["calidad"] in ORDEN_CALIDAD else 99,
                l["fecha"])

    # Lo que hay que trabajar se ve de entrada; el ruido se pliega.
    PLEGABLES = ["Baja", "Sin señal", "Spam"]
    arriba = sorted((l for l in reales if l["calidad"] not in PLEGABLES), key=clave)
    filas = "\n".join(fila(l, deals_por_nombre) for l in arriba)

    for i, grupo in enumerate(PLEGABLES):
        del_grupo = sorted((l for l in reales if l["calidad"] == grupo), key=clave)
        if not del_grupo:
            continue
        gid = f"g{i}"
        rotulo = {"Baja": "de poca señal", "Sin señal": "sin campo de texto en el form",
                  "Spam": "de spam"}[grupo]
        filas += (
            f'\n<tr class="folder"><td colspan="7">'
            f'<button type="button" class="fold" aria-expanded="false" aria-controls="{gid}"'
            f' data-group="{gid}"><span class="sign" aria-hidden="true">+</span>'
            f'{len(del_grupo)} {"lead" if len(del_grupo) == 1 else "leads"} {e(rotulo)}'
            f'</button></td></tr>\n')
        filas += "\n".join(fila(l, deals_por_nombre, grupo=gid) for l in del_grupo)

    hall = "\n".join(
        f'<article class="h{" urgent" if k == "urgent" else ""}">'
        f'<span class="tag">{"Acción inmediata" if k == "urgent" else "Señal"}</span>'
        f"<h3>{e(t)}</h3><p>{e(p)}</p></article>"
        for k, t, p in sig[:3]
    ) or '<article class="h"><h3>Sin señales</h3><p>El mes corre sin banderas.</p></article>'

    nota_pruebas = (f" · {pruebas} registro de prueba fuera del conteo" if pruebas == 1
                    else f" · {pruebas} registros de prueba fuera del conteo" if pruebas else "")

    ads_line = ""
    if ads:
        top = [a for a in ads if a["spend"] > 0 and not a["name"].startswith("eng_")][:4]
        if top:
            items = "".join(
                f'<li><span class="ad">{e(a["name"])}</span>'
                f'<span class="num">${a["spend"]:,.0f}</span>'
                f'<span class="num lead-n">{a["leads"]} leads</span></li>' for a in top)
            ads_line = f'<ul class="ads">{items}</ul>'

    # ── el cruce: de los leads que valen, ¿cuáles venían de pauta? ──
    gasto_por_ad = {a["name"]: a for a in ads}
    filas_attr = []
    con_pauta = 0
    for l in sorted(buenos, key=lambda x: x["fecha"]):
        at = l["attr"]
        con_pauta += bool(at["paid"])
        det = at["detalle"]
        if at["canal"].startswith("Meta · lead form") and det in gasto_por_ad:
            g = gasto_por_ad[det]
            det = f'{det} — ${g["spend"]:,.0f} y {g["leads"]} leads en el mes'
        if at["cuando"]:
            det += (f' · primer contacto el {at["cuando"].day} de '
                    f'{MESES[at["cuando"].month - 1]}, {at["cuando"]:%H:%M}')
        if at["asistencias"]:
            det += f' · asistió {", ".join(at["asistencias"]).lower()}'
        filas_attr.append(
            f'<div class="r"><div class="quien">{e(l["nombre"][:30])}'
            f'<span>{e(l["tier"])} · día {e(l["dia"])}</span></div>'
            f'<div class="canal {"si" if at["paid"] else "no"}">{e(at["canal"])}</div>'
            f'<div class="det">{e(det)}</div></div>')
    attrib_rows = "\n".join(filas_attr) or '<div class="r"><div class="det">Sin leads buenos todavía.</div></div>'
    if buenos:
        attrib_nota = (
            f"{con_pauta} de {len(buenos)} tocaron pauta antes de escribirnos; "
            f"{len(buenos) - con_pauta} llegaron por su cuenta. "
            "La atribución es al PRIMER contacto, no al último: se juntan todos los rastros "
            "que dejó el formulario con la hora en que ocurrió cada uno y gana el más temprano; "
            "si otro canal participó después, se anota como asistencia y no cambia el crédito. "
            "El click id de Meta (FBC) y el client id de GA traen dentro su propia marca de "
            "tiempo, así que un lead que vio un anuncio y volvió días después por su cuenta "
            "se sigue contando como Meta, aunque ningún tablero de plataforma lo reporte así.")
    else:
        attrib_nota = "Todavía no hay leads con potencial este mes."

    # ── qué pasó con los buenos del mes pasado ──
    seg = seguimiento_previo(prev_leads, prev_deals, fuera_crm)
    seguimiento_html = ""
    if seg:
        filas_seg = []
        for s in seg:
            sub_ = " · ".join(v for v in (s["tier"], f'día {s["dia"]}' if s["dia"] else "") if v)
            det = s["nota"]
            if not s["crm"] and s["reporto"]:
                det = f'{det} · lo reporta {s["reporto"]}' if det else f'lo reporta {s["reporto"]}' 
            celda_det = e(det) if det else '<span class="nada">sin nota</span>'
            origen = s["origen"]
            celda_origen = (f'<div class="canal {"si" if s["paid"] else "no"}">'
                            f'{e(s["canal"])}'
                            + (f'<span>{e(origen[:46])}</span>' if origen else "")
                            + '</div>')
            filas_seg.append(
                f'<div class="r"><div class="quien">{e(s["quien"][:34])}'
                f'<span>{e(sub_)}</span></div>'
                f'{celda_origen}'
                f'<div class="canal {"si" if s["avanzo"] else "no"}">{e(s["estado"])}</div>'
                f'<div class="det">{celda_det}</div></div>')
        del_crm = [s for s in seg if s["crm"]]
        anexo = [s for s in seg if not s["crm"]]
        cerradas = [s for s in del_crm if s["cerrada"]]
        parados = [s for s in del_crm if not s["avanzo"]]
        de_pauta = [s for s in del_crm if s["paid"]]
        nota_seg = (f"De {titulo_prev} el CRM registra {len(del_crm)} leads con potencial: "
                    f"{len(cerradas)} cerrados y {len(parados)} sin moverse del arranque. "
                    f"{len(de_pauta)} venían de pauta y {len(del_crm) - len(de_pauta)} "
                    "llegaron por su cuenta. ")
        if anexo:
            nombres = ", ".join(s["quien"] for s in anexo)
            nota_seg += (
                f"La fila de {nombres} la reporta el equipo y no existe en Brevo: va aquí "
                "para que no se pierda, pero queda fuera de todo conteo, "
                if len(anexo) == 1 else
                f"Las filas de {nombres} las reporta el equipo y no existen en Brevo: van "
                "aquí para que no se pierdan, pero quedan fuera de todo conteo, ")
            nota_seg += ("porque las cifras de arriba solo cuentan lo que el CRM puede "
                         "probar. Mientras no se capture, un cierre así no existe para el "
                         "CRM. ")
        nota_seg += ("El hallazgo de etapas de arriba mira los deals de este mes, no los de "
                     f"{titulo_prev}.")
        seguimiento_html = f'''
 <section class="hallazgos">
  <p class="eyebrow">Qué pasó con los buenos de {titulo_prev}</p>
  <div class="attrib seg">{chr(10).join(filas_seg)}</div>
  <p class="fineprint">{nota_seg}</p>
 </section>
'''

    logo = (ASSETS / "logo.svg").read_text(encoding="utf8")
    corte = f"{hoy.day} de {MESES[hoy.month - 1]}"

    return f"""<title>Leads TBP</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,500;6..96,600&family=Inter+Tight:wght@300;400;500;600&display=swap">
<style>
:root {{
  --blue:#1F2F8C; --blue-deep:#0E1A57; --blue-tint:#4F60C0;
  --cream:#F2EEE6; --paper:#FAF7F1; --ink:#111111; --graphite:#5C5C5C; --stone:#B7B2A7;

  --bg:var(--blue);            /* el azul es la marca: es el fondo, no un acento */
  --fg:var(--cream);
  --fg-2:color-mix(in oklab, var(--cream) 78%, transparent);
  --fg-3:color-mix(in oklab, var(--cream) 55%, transparent);
  --hairline:color-mix(in oklab, var(--cream) 22%, transparent);

  --sheet:var(--cream);        /* la tabla invierte a crema para leer datos densos */
  --sheet-lift:var(--paper);
  --sheet-fg:var(--ink);
  --sheet-fg-2:var(--graphite);
  --sheet-rule:var(--stone);
  --sheet-mark:var(--blue);

  --display:"Bodoni Moda","EB Garamond",Georgia,serif;
  --sans:"Inter Tight","Helvetica Neue",Arial,sans-serif;
}}
*{{margin:0;padding:0;box-sizing:border-box}}
html{{background:var(--bg)}}
body{{
  background:var(--bg); color:var(--fg);
  font-family:var(--sans); font-weight:300; font-size:16px; line-height:1.45;
  -webkit-font-smoothing:antialiased; padding-block:56px 72px; padding-inline:24px;
}}
.sheet{{max-width:1120px;margin:0 auto}}

/* ── cabecera ─────────────────────────────────────────── */
header{{display:flex;align-items:flex-end;justify-content:space-between;gap:32px;flex-wrap:wrap;
 padding-bottom:28px;border-bottom:1px solid var(--fg)}}
.eyebrow{{font-size:12px;font-weight:500;letter-spacing:.16em;text-transform:uppercase;color:var(--fg-2)}}
h1{{font-family:var(--display);font-weight:500;font-size:clamp(44px,7.5vw,104px);
 line-height:.92;letter-spacing:-.02em;text-transform:uppercase;margin-top:10px;text-wrap:balance}}
h1 .thin{{color:var(--fg-3)}}
.head-meta{{text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:10px}}
.logo svg{{height:20px;width:auto;display:block}}
.logo svg path{{fill:var(--fg)}}
.corte{{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--fg-3)}}

/* ── cifras ───────────────────────────────────────────── */
.kpis{{display:grid;grid-template-columns:repeat(5,1fr);border-bottom:1px solid var(--hairline)}}
.kpi{{padding:26px 20px 24px 0;border-right:1px solid var(--hairline)}}
.kpi+.kpi{{padding-left:20px}}
.kpi:last-child{{border-right:none}}
.kpi .n{{font-family:var(--display);font-weight:500;font-size:46px;line-height:1;
 letter-spacing:-.02em;font-variant-numeric:tabular-nums}}
.kpi .n small{{font-size:20px;color:var(--fg-3)}}
.kpi .l{{font-size:13px;color:var(--fg-2);margin-top:10px;line-height:1.35}}
.kpi .vs{{display:block;color:var(--fg-3);font-size:12px}}

/* ── tabla: sección invertida sobre crema ─────────────── */
.section-label{{display:flex;justify-content:space-between;align-items:baseline;gap:16px;
 flex-wrap:wrap;margin-top:56px;padding-bottom:14px;font-size:12px;font-weight:500;
 letter-spacing:.16em;text-transform:uppercase;color:var(--fg-2)}}
.tablewrap{{overflow-x:auto;background:var(--sheet);color:var(--sheet-fg);padding:8px 28px 20px}}
table{{width:100%;border-collapse:collapse;min-width:900px}}
thead th{{font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;
 color:var(--sheet-fg-2);text-align:left;padding:18px 12px 10px 0;
 border-bottom:1px solid var(--sheet-fg)}}
tbody td{{padding:11px 12px 11px 0;border-bottom:1px solid var(--sheet-rule);
 vertical-align:top;font-size:14px;color:var(--sheet-fg)}}
td.d{{font-variant-numeric:tabular-nums;color:var(--sheet-fg-2);white-space:nowrap;width:46px}}
td.lead{{font-weight:500;white-space:nowrap}}
td.proy{{color:var(--sheet-fg-2);max-width:360px}}
td.proy q{{quotes:'\\201C' '\\201D'}}
tr.flag td{{background:var(--sheet-lift)}}
tr.flag td:first-child{{box-shadow:inset 3px 0 0 var(--sheet-mark)}}

/* tags: lo único redondo del sistema */
.chip,.q{{display:inline-block;border-radius:999px;white-space:nowrap;
 font-size:11px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;padding:3px 10px}}
.t-deep{{background:var(--sheet-mark);color:var(--cream)}}
.t-core{{background:color-mix(in oklab, var(--sheet-mark) 16%, transparent);color:var(--sheet-mark)}}
.t-sprint{{border:1px solid var(--sheet-rule);color:var(--sheet-fg-2)}}
.t-ba{{border:1px solid var(--sheet-rule);color:var(--sheet-fg-2)}}
.src-meta,.src-web{{font-size:13px;white-space:normal}}
.src-meta{{color:var(--sheet-fg-2)}}
.src-web{{color:var(--sheet-mark);font-weight:500}}
.src-meta .det,.src-web .det{{display:block;font-size:11px;font-weight:300;
 color:var(--sheet-fg-2);opacity:.85;margin-top:2px;overflow-wrap:anywhere}}
.st{{font-size:13px;color:var(--sheet-fg-2);white-space:nowrap}}
.st.nodeal{{color:var(--sheet-fg);font-weight:500}}
.st.nodeal::after{{content:"";display:inline-block;width:5px;height:5px;border-radius:999px;
 background:var(--sheet-mark);margin-left:7px;vertical-align:middle}}
.q-buena{{background:var(--sheet-fg);color:var(--sheet)}}
.q-media{{border:1px solid var(--sheet-rule);color:var(--sheet-fg-2)}}
.q-baja{{color:var(--sheet-fg-2);opacity:.75}}
.q-spam{{color:var(--sheet-fg-2);opacity:.55}}
.q-nodata{{color:var(--sheet-fg-2);opacity:.55}}
.nada{{color:var(--sheet-rule)}}

/* contacto: el nombre abre el correo, la dirección queda a la vista para copiar */
a.mail{{color:inherit;text-decoration:none;border-bottom:1px solid var(--sheet-rule)}}
a.mail:hover{{border-bottom-color:var(--sheet-mark);color:var(--sheet-mark)}}
a.mail:focus-visible{{outline:2px solid var(--sheet-mark);outline-offset:2px}}
.mailaddr{{display:block;font-size:11.5px;font-weight:400;color:var(--sheet-fg-2);
 margin-top:3px;letter-spacing:.01em;user-select:all}}

/* folder: el ruido se pliega, pero se dice cuánto hay */
tr.folder td{{padding:0;border-bottom:1px solid var(--sheet-rule)}}
button.fold{{display:flex;align-items:center;gap:10px;width:100%;padding:13px 0;
 background:none;border:0;cursor:pointer;font:inherit;font-size:11px;font-weight:600;
 letter-spacing:.14em;text-transform:uppercase;color:var(--sheet-fg-2);text-align:left}}
button.fold:hover{{color:var(--sheet-mark)}}
button.fold:focus-visible{{outline:2px solid var(--sheet-mark);outline-offset:-2px}}
button.fold .sign{{display:inline-flex;align-items:center;justify-content:center;
 width:16px;height:16px;border:1px solid currentColor;font-size:12px;line-height:1;
 font-weight:400;letter-spacing:0}}
tr.en-folder td{{background:var(--sheet-lift)}}
tr.en-folder td.d{{box-shadow:inset 1px 0 0 var(--sheet-rule)}}

/* ── hallazgos: sin tarjetas, el aire hace de contenedor ─ */
.hallazgos{{margin-top:64px;border-top:1px solid var(--fg);padding-top:20px}}
.hgrid{{display:grid;grid-template-columns:repeat(3,1fr);gap:40px;margin-top:28px}}
.h{{border-top:1px solid var(--hairline);padding-top:18px}}
.h.urgent{{border-top:2px solid var(--fg)}}
.h .tag{{display:block;font-size:11px;font-weight:500;letter-spacing:.16em;
 text-transform:uppercase;color:var(--fg-3);margin-bottom:14px}}
.h.urgent .tag{{color:var(--fg)}}
.h h3{{font-family:var(--display);font-weight:500;font-size:26px;line-height:1.08;
 letter-spacing:-.01em;margin-bottom:12px;text-wrap:balance}}
.h p{{font-size:14px;color:var(--fg-2);line-height:1.6}}

/* ── gasto por anuncio ────────────────────────────────── */
.ads{{list-style:none;margin-top:44px;border-top:1px solid var(--hairline)}}
.ads li{{display:flex;align-items:baseline;gap:16px;padding:11px 0;
 border-bottom:1px solid var(--hairline);font-size:13px}}
.ads .ad{{flex:1;color:var(--fg-2);font-variant-numeric:tabular-nums;
 overflow-wrap:anywhere}}
.ads .num{{font-variant-numeric:tabular-nums;color:var(--fg);white-space:nowrap}}
.ads .lead-n{{color:var(--fg-3);min-width:74px;text-align:right}}

.attrib{{margin-top:26px;border-top:1px solid var(--hairline)}}
.attrib .r{{display:grid;grid-template-columns:minmax(150px,1.1fr) minmax(120px,.9fr) 2fr;
 gap:16px;align-items:baseline;padding:15px 0;border-bottom:1px solid var(--hairline)}}
.attrib .quien{{font-weight:500}}
.attrib .quien span{{display:block;font-size:12px;color:var(--fg-3);font-weight:300}}
.attrib .canal{{font-size:12px;letter-spacing:.14em;text-transform:uppercase}}
.attrib .canal.si{{color:var(--fg)}}
.attrib .canal.no{{color:var(--fg-3)}}
.attrib .det{{font-size:13.5px;color:var(--fg-2);overflow-wrap:anywhere}}
@media (max-width:700px){{.attrib .r{{grid-template-columns:1fr;gap:6px}}}}
/* el seguimiento lleva una columna más: de dónde vino cada lead */
.attrib.seg .r{{grid-template-columns:minmax(128px,1fr) minmax(116px,.92fr) minmax(104px,.66fr) 1.75fr}}
.attrib .canal span{{display:block;margin-top:3px;font-size:11.5px;font-weight:300;
 letter-spacing:.01em;text-transform:none;color:var(--fg-3);overflow-wrap:anywhere}}
@media (max-width:980px){{.attrib.seg .r{{grid-template-columns:minmax(120px,1fr) minmax(104px,.9fr) 1.4fr}}
 .attrib.seg .r .det{{grid-column:1/-1}}}}
@media (max-width:700px){{.attrib.seg .r{{grid-template-columns:1fr}}}}
.fineprint{{margin-top:28px;font-size:13px;color:var(--fg-3);max-width:68ch;line-height:1.6}}

footer{{margin-top:72px;padding-top:20px;border-top:1px solid var(--fg);
 display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;
 font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--fg-3)}}
footer .firma{{color:var(--fg)}}

@media (max-width:900px){{
 .kpis{{grid-template-columns:repeat(2,1fr)}}
 .kpi{{border-top:1px solid var(--hairline);padding-left:0!important}}
 .kpi:nth-child(odd){{border-right:1px solid var(--hairline)}}
 .kpi:nth-child(even){{border-right:none;padding-left:20px!important}}
 .hgrid{{grid-template-columns:1fr;gap:28px}}
 .head-meta{{text-align:left;align-items:flex-start}}
 .tablewrap{{padding-inline:16px}}
}}
@media (prefers-reduced-motion:reduce){{*{{animation:none!important;transition:none!important}}}}
</style>

<div class="sheet">
 <header>
  <div>
   <p class="eyebrow">Estatus de leads · paid &amp; webform</p>
   <h1>Leads de<br>{MESES[m - 1]} <span class="thin">{y}</span></h1>
  </div>
  <div class="head-meta">
   <div class="logo">{logo}</div>
   <p class="corte">Corte al {corte}</p>
   <p class="corte">Meta Ads + Brevo</p>
  </div>
 </header>

 <section class="kpis" aria-label="Resumen del mes">{kpis}</section>

 <p class="section-label"><span>Quién llegó · por calidad</span>
  <span>{titulo} al día {hoy.day} · {len(reales)} personas{nota_pruebas}</span></p>
 <div class="tablewrap">
  <table>
   <thead><tr><th>Llegó</th><th>Lead</th><th>Proyecto, en sus palabras</th>
    <th>Tier</th><th>Primer contacto</th><th>Etapa CRM</th><th>Calidad</th></tr></thead>
   <tbody>
{filas}
   </tbody>
  </table>
 </div>

 <section class="hallazgos">
  <p class="eyebrow">Lo que dicen los números</p>
  <div class="hgrid">{hall}</div>
  {ads_line}
 </section>

 <section class="hallazgos">
  <p class="eyebrow">Los buenos, ¿tocaron pauta?</p>
  <div class="attrib">{attrib_rows}</div>
  <p class="fineprint">{attrib_nota}</p>
 </section>
{seguimiento_html}
 <section class="hallazgos" style="border-top:none;padding-top:0;margin-top:34px">
  <p class="fineprint">La calidad es una primera pasada automática sobre lo que cada persona
   escribió en el formulario: el equipo revisa los casos de frontera. Las filas marcadas son
   leads con potencial real que siguen en First Contact.</p>
 </section>

 <footer>
  <span class="firma">tbp.</span>
  <span>Karma Creative Lab · {hoy.day}.{hoy.month:02d}.{hoy.year}</span>
 </footer>
</div>

<script>
(function () {{
  // Los grupos de baja calidad se pliegan: la tabla abre en lo que hay que trabajar.
  document.addEventListener("click", function (ev) {{
    var b = ev.target.closest && ev.target.closest("button.fold");
    if (!b) return;
    var abierto = b.getAttribute("aria-expanded") === "true";
    b.setAttribute("aria-expanded", abierto ? "false" : "true");
    b.querySelector(".sign").textContent = abierto ? "+" : "\u2212";
    var filas = document.querySelectorAll('tr[data-in="' + b.dataset.group + '"]');
    Array.prototype.forEach.call(filas, function (tr) {{ tr.hidden = abierto; }});
  }});
}}());
</script>
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mes", default=None, help="YYYY-MM (por defecto, el mes en curso)")
    ap.add_argument("--out", default=str(ROOT / "out" / "leads-tbp.html"))
    args = ap.parse_args()

    load_env()
    hoy = dt.date.today()
    mes = args.mes or hoy.strftime("%Y-%m")
    pm = prev_mes(mes)

    key = os.environ["BREVO_API_KEY"]
    tok = os.environ["META_TOKEN_TBP"]
    acct = os.environ["META_ACCOUNT_TBP"]

    contactos, deals_raw, stages = fetch_brevo(key, mes)
    leads = leads_del_mes(contactos, mes)
    prev_leads = leads_del_mes(contactos, pm)
    deals = deals_del_mes(deals_raw, stages, mes)
    prev_deals = deals_del_mes(deals_raw, stages, pm)
    fuera_crm = carga_fuera_crm(pm)

    ini, fin = mes_bounds(mes, hoy)
    pini, pfin = mes_bounds(pm, hoy)
    meta = fetch_meta(tok, acct, ini.isoformat(), fin.isoformat())
    meta_prev = fetch_meta(tok, acct, pini.isoformat(), pfin.isoformat())
    ads = fetch_meta_ads(tok, acct, ini.isoformat(), fin.isoformat())

    sig = señales(leads, deals, ads, meta, meta_prev)
    out = pathlib.Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(render(mes, hoy, leads, deals, ads, meta, meta_prev, prev_leads, sig,
                          prev_deals=prev_deals, fuera_crm=fuera_crm),
                   encoding="utf8")

    # Rastro para la rutina: qué se armó hoy, sin tener que abrir el HTML.
    reales = [l for l in leads if not l["prueba"]]
    web_reales = [l for l in reales if l["fuente"] != "Meta"]
    canales = {}
    for l in reales:
        canales[l["attr"]["canal"]] = canales.get(l["attr"]["canal"], 0) + 1
    resumen = {
        "mes": mes, "corte": hoy.isoformat(), "leads": len(reales),
        "por_canal_primer_contacto": canales,
        "trackeo": {
            "webform": len(web_reales),
            "sin_rastro": sum(1 for l in web_reales
                              if l["attr"]["canal"] == "Directo"
                              and "sin rastro" in l["attr"]["detalle"]),
        },
        "con_potencial": len([l for l in reales if l["calidad"] in CON_POTENCIAL]),
        "spend": meta["spend"], "cpl": meta["cpl"], "deals": len(deals),
        "señales": [t for _, t, _ in sig], "html": str(out),
    }
    (out.parent / "resumen.json").write_text(json.dumps(resumen, ensure_ascii=False, indent=1))
    print(json.dumps(resumen, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
