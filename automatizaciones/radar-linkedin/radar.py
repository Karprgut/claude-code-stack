#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Radar de demanda — Karma Creative Lab
Busca en LinkedIn posteos de gente que pide agencia de marketing digital.
Fuente: API de Exa (api.exa.ai/search) con filtro de fecha de publicacion.

Uso:
    python3 radar.py                  # ultimos 7 dias
    python3 radar.py --dias 14        # ventana mas ancha
    python3 radar.py --dry-run        # no marca nada como visto
    python3 radar.py --todo           # ignora el archivo de vistos
"""
import argparse, csv, json, os, re, sys, time, unicodedata
import urllib.request, urllib.error, urllib.parse
from datetime import datetime, timedelta, timezone

BASE     = os.path.dirname(os.path.abspath(__file__))
ENV      = os.path.expanduser("~/.config/kcl-radar/env")   # la llave no vive con el codigo
VISTOS   = os.path.join(BASE, "vistos.json")
SALIDAS  = os.path.join(BASE, "salidas")
API      = "https://api.exa.ai/search"
ENV_SC   = os.path.expanduser("~/.config/scrapecreators/env")
API_SC   = "https://api.scrapecreators.com/v1/linkedin/post"
API_SC_B = "https://api.scrapecreators.com/v1/linkedin/search/posts"   # ojo: search/posts, no search-posts
API_SC_P = "https://api.scrapecreators.com/v1/linkedin/profile"

# ScrapeCreators busca por Google indexado: en ingles funciona y trae el posteo
# completo con autor y comentarios en la misma llamada; en español devuelve ruido
# sin relacion. Por eso el barrido en ingles es suyo y el de español se queda en Exa.
QUERIES_EN = [
 "looking for a digital marketing agency recommendations",
 "looking for a paid media agency for our brand",
 "we are looking for a social media agency retainer",
 "searching for a performance marketing agency partner",
 "any recommendations for a B2B marketing agency",
 "RFP open for a marketing agency",
 "looking for a CRM or marketing automation agency",
 "looking for a programmatic or retail media agency",
 "looking for an AI marketing agency or consultancy",
 "looking for an influencer marketing agency",
 "looking for a media planning and buying agency",
]

# Fraseos. Los primeros son los obvios; los de abajo son los nichos donde
# no hay cola de agencias compitiendo en los comentarios.
# México es el mercado principal, así que se barre con mucho más detalle: por
# ciudad, por industria y por tipo de encargo. Los posteos no escriben "México",
# escriben CDMX, Monterrey o Guadalajara, y rara vez dicen "agencia de marketing
# digital" completo: dicen "quien me recomienda para llevar mis redes".
QUERIES_MX = [
 "publicacion de LinkedIn de una empresa mexicana que busca agencia de marketing digital y pide recomendaciones",
 "publicacion de LinkedIn donde buscan agencia de marketing en CDMX o Ciudad de Mexico",
 "publicacion de LinkedIn donde buscan agencia de marketing en Monterrey o Guadalajara",
 "publicacion de LinkedIn donde buscan agencia en Queretaro, Puebla, Merida, Tijuana o Cancun",
 "publicacion de LinkedIn donde una marca mexicana busca agencia de pauta digital o performance para Meta y Google Ads",
 "publicacion de LinkedIn donde una empresa mexicana busca agencia para manejar sus redes sociales y contenido",
 "publicacion de LinkedIn donde una marca mexicana busca agencia de ecommerce, marketplaces o retail media",
 "publicacion de LinkedIn donde buscan agencia de branding, identidad o rebranding para una marca mexicana",
 "publicacion de LinkedIn donde buscan agencia de influencer marketing o UGC en Mexico",
 "publicacion de LinkedIn de una pyme o startup mexicana que necesita agencia de marketing y pide referencias",
 "publicacion de LinkedIn de un director de marketing en Mexico pidiendo a su red que le recomienden agencia",
 "publicacion de LinkedIn con convocatoria, RFP o concurso de cuenta publicitaria en Mexico",
 "publicacion de LinkedIn donde una empresa mexicana busca agencia para su tienda en linea o Shopify",
 "publicacion de LinkedIn donde buscan agencia de medios o planeacion de medios en Mexico",
]

# Kar no solo vende paid: el radar barre cada disciplina por separado, porque
# quien busca "agencia de CRM" nunca escribe "agencia de marketing digital".
QUERIES_DISC = [
 "publicacion de LinkedIn donde una empresa en Mexico busca agencia o consultora de CRM, automatizacion y email marketing",
 "publicacion de LinkedIn donde buscan agencia de programatica, compra programatica o DSP en Mexico o Latinoamerica",
 "publicacion de LinkedIn donde buscan consultora de audiencias, data, DMP o CDP para una marca",
 "publicacion de LinkedIn donde buscan agencia o consultora de inteligencia artificial aplicada a marketing",
 "publicacion de LinkedIn donde buscan agencia de retail media, shopper marketing o trade marketing en Mexico",
 "publicacion de LinkedIn donde buscan agencia de medios offline: television, radio, OOH, espectaculares o prensa en Mexico",
 "publicacion de LinkedIn donde buscan agencia de analitica, medicion, atribucion o dashboards de marketing",
 "publicacion de LinkedIn donde buscan agencia de tecnologia, martech o implementacion de plataformas de marketing",
 "publicacion de LinkedIn donde buscan agencia de influencers, creadores de contenido o vocerias en Mexico",
 "publicacion de LinkedIn donde buscan agencia de relaciones publicas, activaciones o eventos para una marca mexicana",
]

QUERIES = [
 "publicacion de LinkedIn de una empresa colombiana en Bogota o Medellin que busca agencia de marketing digital o publicidad",
 "publicacion de LinkedIn de una empresa peruana en Lima que busca agencia de marketing digital, publicidad o redes sociales",
 "publicacion de LinkedIn con una convocatoria o RFP abierta para elegir agencia de marketing, concurso de cuenta publicitaria",
 "publicacion de LinkedIn donde buscan agencia especializada en un nicho: influencer marketing, UGC, retail media, trade marketing, ecommerce",
 "LinkedIn post asking for an agency with an unusual requirement, such as human made creative without AI or a specific industry vertical",
]

# --- senales de clasificacion ---------------------------------------------
SIG_DEMANDA = [
 "busco agencia","buscamos agencia","busco una agencia","buscamos una agencia",
 "estoy buscando agencia","estoy buscando una agencia","en busca de una agencia",
 "recomendaciones de agencia","recomiendan alguna agencia","alguna agencia que",
 "busco proveedor","buscamos proveedor","busco aliado","buscamos aliados",
 "rfp","licitacion","cotizacion de agencia","pitch de agencia",
 "looking for an agency","looking for a agency","searching for an agency",
 "agency recommendations","recommend an agency","looking for a partner",
 "looking for a digital marketing","looking for a paid media","agency or freelancer",
 # --- fraseo no obvio: aqui viven los posteos sin cola de agencias ---
 "quien me recomienda","me recomiendan alguna","alguien que me recomiende",
 "me pueden recomendar","alguna recomendacion de","conocen alguna agencia",
 "conocen a alguien que","necesito a alguien que","busco a alguien que",
 "estoy armando un equipo","base de proveedores","aliados estrategicos",
 "who are the best","any recommendations","anyone know a ","anyone know an ",
 "agency recs","intros in comments","crowdsourcing some recommendations",
 "crowdsourcing recommendations","who do i know that","looking for someone to",
 "need someone to","will pay for the time","happy to pay","account review",
 "account audit","audit of our","who should i talk to","any leads on",
]
SIG_VACANTE = [
 "vacante","postula","postular","postulate","envia tu cv","enviar cv","manda tu cv",
 "sueldo","salario","prestaciones de ley","horario","tiempo completo","medio tiempo",
 "se solicita","unete al equipo","unirse al equipo","forma parte del equipo",
 "zona de trabajo","lugar de trabajo","contratacion inmediata","requisitos:",
 "we are hiring","we're hiring","now hiring","join our team","apply now",
 "send your resume","job opening","this role","the role","full-time","part-time",
 # reclutamiento de persona o socio, no de proveedor
 "co-founder","cofounder","co founder","founding partner","cofundador",
 "socio fundador","entrepreneurial mindset","not looking for an employee",
 "equity","vesting","unete a nosotros",
 # ruido real visto el 6-oct: reclutamiento disfrazado
 "para sumarse","sumarse a","para el equipo","a nuestro equipo","del equipo de",
 "esta oportunidad es para ti","oportunidad laboral","se busca","buscamos a nuestro",
 "postulate","aplica aqui","comparte tu cv","link en los comentarios",
 "#empleo","#vacante","#oportunidadlaboral","#hiring","#jobs","#trabajo",
 "product manager","analista de","coordinador de","ejecutivo de cuenta",
 "practicante","becario","pasante","al equipo","se incorpore",
 "we're hiring","we are hiring","hiring:","estamos contratando","contratamos",
 # los hashtags van pegados y esquivan las señales con espacio
 "wearehiring","werehiring","nowhiring","hiringnow","jobalert","empleo",
 "oportunidadlaboral","unetealequipo","vacantes",
 "una persona con","perfil creativo","buscamos una persona",
 "alguien que quiera","alguien que se sume","que se sume","quiera hacer",
 "to join our","to join us","to join the team","join our team","we're growing",
 "we are growing","senior manager","marketing manager","account manager",
]
SIG_OFERTA = [  # agencia promocionandose
 "somos una agencia","en nuestra agencia","te ayudamos","podemos ayudarte",
 "ofrecemos servicios","agenda una llamada","agenda tu","nuestros clientes",
 "we are an agency","we help brands","book a call","dm me to learn",
 "si estuviera buscando","si estas buscando","cuando fue la ultima vez",
 "no empezaria preguntando","te cuento como","aqui te dejo",
 # el anuncio clasico de agencia es una pregunta al lector
 "buscas una agencia","buscas agencia","necesitas una agencia","necesitas agencia",
 "are you looking for an agency","looking for an agency?","somos tu agencia",
 "tu agencia de","agencia de google ads en","agencia de marketing en",
]

MERCADOS = {
 "MX": ["mexico","mexicano","mexicana","cdmx","ciudad de mexico","guadalajara",
        "monterrey","queretaro","puebla","merida","tijuana","cancun",
        "mxn","pesos mexicanos","oxxo"],
 "CO": ["colombia","colombiano","colombiana","bogota","medellin","cali",
        "barranquilla","cartagena","bucaramanga","nequi","bancolombia"],
 "PE": ["peru","peruano","peruana","lima","arequipa","trujillo","cusco",
        "soles","sunat","yape"],
 "US": ["estados unidos","united states","usa","american","new york",
        "los angeles","san francisco","chicago","miami","texas","california",
        "florida","boston","seattle","atlanta","denver","austin","usd",
        "north america"],
}
# Si aparece uno de estos y ninguno de los de arriba, el posteo no es para KCL.
FUERA = ["espana","madrid","barcelona","valencia","sevilla","bilbao","canarias",
         "argentina","argentino","buenos aires","caba","rosario",
         "chile","chileno","ecuador","quito","guayaquil",
         "uruguay","montevideo","paraguay","bolivia","venezuela",
         "guatemala","el salvador","honduras","nicaragua","costa rica","panama",
         "republica dominicana","puerto rico","india","mumbai","delhi",
         "bangalore","pakistan","london","reino unido","canada","australia",
         "dubai","singapore","filipinas","indonesia"]

_CACHE_RX = {}

def _cuenta(señales, t):
    """Cuenta señales como PALABRA COMPLETA. Sin esto 'usa' pega dentro de
    'usamos' y 'cali' dentro de 'calidad', que en español pasa todo el tiempo."""
    total = 0
    for k in señales:
        rx = _CACHE_RX.get(k)
        if rx is None:
            rx = _CACHE_RX[k] = re.compile(r"(?<![a-z0-9])" + re.escape(k) + r"(?![a-z0-9])")
        total += len(rx.findall(t))
    return total

def mercado(titulo, texto):
    """MX/CO/PE/US, 'fuera' si es de otro pais, o '' si el posteo no lo dice.

    Se cuenta, no se devuelve la primera coincidencia: un posteo que dice
    'agencia de marketing argentina' y de paso nombra a un cliente 'LAY US B2B'
    salia marcado como Estados Unidos.
    """
    t = norm(titulo) + " || " + norm(texto)
    puntos = {c: _cuenta(k, t) for c, k in MERCADOS.items()}
    # "US" en mayusculas es el pais; "us" en minusculas es el pronombre ingles
    # de "help us scale". Por eso este se busca sobre el texto SIN normalizar.
    crudo = (titulo or "") + " " + (texto or "")
    puntos["US"] += len(re.findall(r"(?<![A-Za-z])U\.?S\.?(?![A-Za-z])", crudo))
    mejor = max(puntos, key=lambda c: puntos[c])
    fuera = _cuenta(FUERA, t)
    if puntos[mejor] == 0:
        return "fuera" if fuera else ""
    # empate o ventaja de lo ajeno: se descarta, mas vale perder uno que
    # mandarle a Kar prospectos de otro continente
    return mejor if puntos[mejor] > fuera else "fuera"

def norm(s):
    # LinkedIn esta lleno de texto "fancy" (𝗖𝗼-𝗙𝗼𝘂𝗻𝗱𝗲𝗿): son code points
    # matematicos distintos de las letras ASCII, asi que ninguna señal pegaba y
    # un posteo que buscaba cofundador entraba como demanda. NFKC los aplana.
    s = unicodedata.normalize("NFKC", s or "").lower()
    rep = {"á":"a","é":"e","í":"i","ó":"o","ú":"u","ñ":"n","ü":"u"}
    for a,b in rep.items(): s = s.replace(a,b)
    return re.sub(r"\s+"," ", s)

def clasifica(titulo, texto):
    """DEMANDA / VACANTE / OFERTA / OTRO + puntaje, leyendo el post completo."""
    t = norm(titulo) + " || " + norm(texto)
    # Tiene que pedir una AGENCIA o consultora: ambas son empresas. Un posteo que
    # solo busca freelance o "alguien" es contratacion de persona y no sirve.
    # "agencia o freelancer" si pasa, porque acepta agencia.
    PROVEEDOR = r"(agenc\w+|agency|agencies|consultora|consultancy)"
    if not re.search(PROVEEDOR, t):
        return "OTRO", 0
    # No basta con que la palabra "agencia" aparezca: tiene que estar PEGADA a un
    # verbo de busqueda. Sin esto entran las agencias opinando sobre agencias
    # ("Your agency doesn't need a better pitch") y las vacantes de empresas que
    # de paso mencionan la suya. La ventana son 80 caracteres sin cambiar de frase.
    BUSCA_AGENCIA = (r"(busco|buscamos|buscando|en busqueda de|en busca de|"
                     r"looking for|looking to|in search of|need an?|needs an?|"
                     r"seeking|sourcing|recommendations? for|recomendaciones de|"
                     r"rfp|convocatoria|open sourcing)"
                     r"[^.]{0,100}" + PROVEEDOR)
    AGENCIA_BUSCADA = (PROVEEDOR + r"[^.]{0,50}"
                       r"(recommendation|recomendac|que me recomienden|wanted|needed)")
    # ...y tiene que declararse ARRIBA. Quien busca agencia lo dice en la primera
    # linea; cuando "agencia" aparece recien en el parrafo seis suele ser una
    # agencia hablando de si misma o una vacante que de paso menciona a su
    # proveedor. Medir solo el arranque es lo que separa un caso del otro.
    arranque = (norm(titulo) + " || " + norm(texto))[:320]
    if not (re.search(BUSCA_AGENCIA, arranque) or re.search(AGENCIA_BUSCADA, arranque)):
        return "OTRO", 0
    # ...y que el encargo sea de lo nuestro. Sin esto entran licitaciones de
    # rutas logisticas y demas compras que nada tienen que ver con marketing.
    TEMA = (r"(marketing|mercadotecnia|publicidad|publicitar|pauta|ads\b|advertis\w+|"
            r"social media|redes sociales|community|contenido|content|seo|sem|"
            r"performance|branding|marca|medios|media|growth|campan\w+|campaign|"
            r"ecommerce|e-commerce|influencer|ugc|crm|embudo|funnel|leads?|"
            r"digital|disen\w+|creativ\w+|comunicacion|"
            # el rubro es mas ancho que paid: tecnologia, datos y offline tambien
            r"programatic\w*|programmatic|audienci\w+|segmentacion|data|dmp|cdp|"
            r"martech|adtech|analytic\w*|analitica|medicion|atribucion|dashboard|"
            r"automatizacion|automation|email marketing|mailing|newsletter|"
            r"inteligencia artificial|chatbot|whatsapp|loyalty|fidelizacion|"
            r"retail media|shopper|trade marketing|punto de venta|"
            r"ooh|out of home|espectacular|btl|atl|radio|television|televisora|"
            r"prensa|revista|activacion\w*|evento|patrocinio|relaciones publicas|"
            r"crm|salesforce|hubspot|tecnologia|plataforma|stack)")
    if not re.search(TEMA, t):
        return "OTRO", 0
    d = sum(1 for k in SIG_DEMANDA if k in t)
    v = sum(1 for k in SIG_VACANTE if k in t)
    o = sum(1 for k in SIG_OFERTA  if k in t)
    # la palabra "agencia"/"agency" cerca de un verbo de busqueda pesa doble
    if re.search(r"(busco|buscamos|buscando|busque|looking for|in search of|need)\s+(una?\s+)?(agenc\w+|agency|consultora|consultancy|partner|proveedor)", t):
        d += 2
    # "busco a alguien que..." / "looking for someone to..." tambien es demanda
    if re.search(r"(busco|buscamos|buscando|looking for|need|in search of)\s+(a\s+|an\s+)?(alguien|someone|somebody)", t):
        d += 2
    # pregunta abierta a la red pidiendo nombres
    if re.search(r"(who are the best|quien(es)? (me )?recomienda|recommendations:?\s*who)", t):
        d += 2
    # "buscamos a alguien que [verbo]" es contratar persona. Pesa 3, pero no
    # arrasa: un posteo que ademas dice "puede ser agencia o freelancer" junta
    # mas señales de demanda y sigue pasando, que es lo correcto.
    if re.search(r"(buscamos|estamos buscando|busco|buscando) a (alguien|una persona) que", t):
        v += 3
    # "alguien PARA EL EQUIPO" es contratar persona, no proveedor
    if re.search(r"(alguien|someone|persona)[^.]{0,60}(equipo|team|plantilla|staff)", t):
        v_extra = 3
    else:
        v_extra = 0
    # "¿Buscas una agencia de X?" le habla al lector: es el anuncio clasico de
    # una agencia, no alguien pidiendo uno. Pesa fuerte o se cuela por empate.
    if re.search(r"(buscas|necesitas|are you looking for)\s+(una?\s+)?(agenc|agency)", t):
        o += 3
    # convocatoria solo cuenta si de verdad convoca agencias
    if "convocatoria" in t and re.search(r"convocatoria[^.]{0,80}" + PROVEEDOR, t):
        d += 2
    v += v_extra
    if d == 0 and v == 0 and o == 0: return "OTRO", 0
    if d >= max(v, o) and d > 0:     return "DEMANDA", d
    if v >= o:                       return "VACANTE", v
    return "OFERTA", o

def activity_id(url):
    m = re.search(r"(?:activity[-:])(\d{10,})", url or "")
    return m.group(1) if m else (url or "")

def lee_env():
    key = os.environ.get("EXA_API_KEY")
    if key: return key.strip()
    if os.path.exists(ENV):
        for ln in open(ENV, encoding="utf-8"):
            ln = ln.strip()
            if ln.startswith("EXA_API_KEY"):
                k = ln.split("=",1)[1].strip().strip('"').strip("'")
                if k: return k
    sys.exit("Falta la llave de Exa.\n"
             "  1. Creala en https://dashboard.exa.ai/api-keys\n"
             "  2. Pegala en %s como:  EXA_API_KEY=tu_llave" % ENV)

def llave_sc():
    """Llave de ScrapeCreators. Opcional: sin ella el radar funciona igual,
    solo que sin enriquecer."""
    k = os.environ.get("SCRAPECREATORS_API_KEY")
    if k: return k.strip()
    if os.path.exists(ENV_SC):
        for ln in open(ENV_SC, encoding="utf-8"):
            if ln.strip().startswith("SCRAPECREATORS_API_KEY"):
                v = ln.split("=",1)[1].strip().strip('"').strip("'")
                if v: return v
    return ""

def _get_sc(url, key, timeout=60):
    req = urllib.request.Request(url, headers={"x-api-key": key})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode("utf-8"))
    except Exception:
        return {}

def busca_sc(query, key, periodo="last-week", paginas=2):
    """Barrido en ingles. Devuelve lo mismo que Exa pero ya con autor y
    comentarios, asi que estos no necesitan enriquecerse despues."""
    out = []
    for pag in range(1, paginas + 1):
        u = (API_SC_B + "?query=" + urllib.parse.quote(query)
             + "&date_posted=" + periodo + ("&cursor=%d" % pag if pag > 1 else ""))
        d = _get_sc(u, key)
        ps = d.get("posts") or []
        if not ps: break
        out.extend(ps)
        if not d.get("cursor"): break
    return out

def cerrado(d):
    """¿El autor ya dijo que cerró? Un posteo cerrado no es prospecto."""
    autor = ((d.get("author") or {}).get("name") or "").strip().lower()
    señales = ("ya cerramos", "ya encontre", "ya encontramos", "convocatoria cerrada",
               "cerrada", "gracias a todos", "ya tengo", "ya elegimos",
               "closing this", "closed", "found someone", "no longer looking",
               "thank you all", "overwhelmed by the response")
    for c in (d.get("comments") or []):
        a = c.get("author")
        nom = (a.get("name") if isinstance(a, dict) else a) or ""
        if autor and str(nom).strip().lower() == autor:
            t = norm(c.get("text") or "")
            if any(k in t for k in señales): return True
    return False

def pais_de_ubicacion(txt):
    """'Cary, North Carolina, United States' -> US. La ubicacion declarada en el
    perfil es la senal mas fuerte que hay: gana al subdominio y al texto."""
    t = norm(txt)
    if not t: return ""
    if "united states" in t or "estados unidos" in t: return "US"
    if "mexico" in t: return "MX"
    if "colombia" in t: return "CO"
    if "peru" in t: return "PE"
    for k in FUERA:
        if k in t: return "fuera"
    return ""

def perfil(url_perfil, key):
    """Ubicacion exacta y empresa actual. 1 credito, y vale: 'Merida, Yucatan'
    dice mucho mas que 'MX' para decidir si el prospecto es tuyo."""
    d = _get_sc(API_SC_P + "?url=" + urllib.parse.quote(url_perfil, safe=""), key)
    if not d or d.get("error"): return {}
    emp = ""
    for e in (d.get("experience") or [])[:1]:
        if isinstance(e, dict) and e.get("name") and "*" not in str(e.get("name")):
            emp = e["name"]
    return {"ubicacion": d.get("location") or "", "empresa": emp,
            "conexiones": d.get("connections") or ""}

def enriquece(url, key):
    """Autor, su pais y cuanta competencia ya tiene el posteo. 1 credito.

    El pais sale del subdominio del perfil (mx.linkedin.com), que es mucho mas
    confiable que adivinarlo del texto. commentCount es el dato que faltaba:
    mide a cuantas agencias hay que ganarles para que te lean.
    """
    d = _get_sc(API_SC + "?url=" + urllib.parse.quote(url, safe=""), key)
    if not d or d.get("error"): return {}
    a = d.get("author") or {}
    m = re.match(r"https?://([a-z]{2})\.linkedin\.com", a.get("url") or "")
    return {"autor": a.get("name") or "", "autor_url": a.get("url") or "",
            "autor_pais": (m.group(1).upper() if m else ""),
            "seguidores": a.get("followers") or "",
            "likes": d.get("likeCount") or 0,
            "comentarios": d.get("commentCount") or 0,
            "cerrado": cerrado(d),
            "quien_comento": " · ".join(
                str((c.get("author") or {}).get("name") if isinstance(c.get("author"), dict)
                    else c.get("author") or "")[:28]
                for c in (d.get("comments") or [])[:5])}

def busca(key, query, desde, n):
    body = json.dumps({
        "query": query,
        "type": "auto",
        "numResults": n,
        "includeDomains": ["linkedin.com"],
        "startPublishedDate": desde,
        "contents": {"text": {"maxCharacters": 1800}},
    }).encode("utf-8")
    req = urllib.request.Request(API, data=body, method="POST", headers={
        "x-api-key": key, "Content-Type": "application/json"})
    for intento in range(3):
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            cuerpo = e.read().decode("utf-8", "ignore")[:300]
            if e.code in (401, 403):   # credencial mala: no tiene caso seguir
                sys.exit("\nLa llave de Exa no sirve (HTTP %s).\n%s\nRevisa %s"
                         % (e.code, cuerpo, ENV))
            if e.code in (429, 500, 502, 503) and intento < 2:
                time.sleep(5 * (intento + 1)); continue
            print("  ! HTTP %s: %s" % (e.code, cuerpo), file=sys.stderr)
            return {"results": []}
        except Exception as e:
            if intento < 2: time.sleep(5); continue
            print("  ! %s" % e, file=sys.stderr)
            return {"results": []}
    return {"results": []}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dias", type=int, default=7)
    ap.add_argument("--n", type=int, default=25, help="resultados por fraseo")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--todo", action="store_true", help="no filtrar por vistos")
    ap.add_argument("--sin-enriquecer", action="store_true",
                    help="no gastar creditos de ScrapeCreators")
    a = ap.parse_args()

    key   = lee_env()
    corte = datetime.now(timezone.utc) - timedelta(days=a.dias)
    desde = corte.strftime("%Y-%m-%dT%H:%M:%SZ")

    vistos = {}
    if os.path.exists(VISTOS) and not a.todo:
        try: vistos = json.load(open(VISTOS, encoding="utf-8"))
        except Exception: vistos = {}

    print("Radar KCL · ventana de %d dias (desde %s) · %d fraseos"
          % (a.dias, desde[:10], len(QUERIES)))

    crudos, costo = {}, 0.0
    # México va con más fraseos y más resultados por fraseo que el resto.
    plan = ([(q, a.n + 15, "MX") for q in QUERIES_MX]
            + [(q, a.n + 5, "DS") for q in QUERIES_DISC]
            + [(q, a.n, "··") for q in QUERIES])
    print("Exa · español (%d fraseos: %d México, %d por disciplina)"
          % (len(plan), len(QUERIES_MX), len(QUERIES_DISC)))
    for i, (q, nres, tag) in enumerate(plan, 1):
        print("  [%2d/%d] %s %s..." % (i, len(plan), tag, q[:54]))
        r = busca(key, q, desde, nres)
        try: costo += float(r.get("costDollars", {}).get("total", 0) or 0)
        except Exception: pass
        for it in r.get("results", []):
            u = it.get("url", "")
            if "/posts/" not in u and "/feed/update/" not in u: continue
            crudos.setdefault(activity_id(u), it)

    # Segunda fuente, en ingles. Trae el posteo ya completo (autor, comentarios),
    # asi que estos entran al mismo embudo sin necesitar enriquecimiento aparte.
    key_sc_b = "" if a.sin_enriquecer else llave_sc()
    yalisto = {}
    if key_sc_b:
        periodo = "last-week" if a.dias <= 14 else "last-month"
        print("\nScrapeCreators · inglés (%d fraseos, %s)" % (len(QUERIES_EN), periodo))
        for i, q in enumerate(QUERIES_EN, 1):
            ps = busca_sc(q, key_sc_b, periodo, paginas=2)
            print("  [%d/%d] %-46s -> %d" % (i, len(QUERIES_EN), q[:46], len(ps)))
            for pst in ps:
                u = pst.get("url", "")
                if "/posts/" not in u and "/feed/update/" not in u: continue
                aid = activity_id(u)
                if aid in crudos: continue
                crudos[aid] = {"url": u, "title": (pst.get("description") or "")[:200],
                               "text": pst.get("description") or "",
                               "publishedDate": pst.get("datePublished") or "",
                               "author": (pst.get("author") or {}).get("name") or ""}
                yalisto[aid] = pst

    if crudos:
        cr = os.path.join(SALIDAS, "crudos-%s.json" % datetime.now().strftime("%Y-%m-%d-%H%M"))
        json.dump([{"url": x.get("url"), "titulo": x.get("title"),
                    "fecha": (x.get("publishedDate") or "")[:10],
                    "autor": x.get("author"), "texto": x.get("text")}
                   for x in crudos.values()], open(cr, "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)

    filas, desc = [], {"VACANTE":0, "OFERTA":0, "OTRO":0, "VIEJO":0,
                       "REPETIDO":0, "OTRO PAIS":0, "YA CERRADO":0}
    for aid, it in crudos.items():
        pub = (it.get("publishedDate") or "")[:10]
        if pub and pub < corte.strftime("%Y-%m-%d"):
            desc["VIEJO"] += 1; continue
        if aid in vistos:
            desc["REPETIDO"] += 1; continue
        tipo, score = clasifica(it.get("title"), it.get("text"))
        if tipo != "DEMANDA":
            desc[tipo] += 1; continue
        mk = mercado(it.get("title"), it.get("text"))
        if mk == "fuera":
            desc["OTRO PAIS"] += 1; continue
        # El indice antepone "# <primer parrafo> · <fecha>" al texto, y el posteo
        # vuelve a empezar con ese mismo parrafo: sin quitarlo, todo sale doble.
        raw = it.get("text") or ""
        raw = re.sub(r"\A#[^\n]*\n+", "", raw)
        raw = re.split(r"\n##\s|\n\*\*Reshared from", raw)[0]
        txt = re.sub(r"\s+", " ", raw)[:600]
        filas.append({"fecha": pub or "s/f", "autor": it.get("author") or "s/n",
                      "titulo": re.sub(r"\s+"," ", it.get("title") or "")[:160],
                      "extracto": txt, "mercado": mk or "?", "score": score,
                      "url": it.get("url"), "id": aid})

    # Enriquecer solo lo nuevo: 1 credito por prospecto, no por posteo revisado.
    key_sc = "" if a.sin_enriquecer else llave_sc()
    if key_sc and filas:
        print("\nEnriqueciendo %d prospecto(s) con ScrapeCreators..." % len(filas))
        for f in filas:
            pst = yalisto.get(f["id"])
            if pst:   # vino de ScrapeCreators: ya trae todo, no se paga de nuevo
                au = pst.get("author") or {}
                m = re.match(r"https?://([a-z]{2})\.linkedin\.com", au.get("url") or "")
                extra = {"autor": au.get("name") or "", "autor_url": au.get("url") or "",
                         "autor_pais": (m.group(1).upper() if m else ""),
                         "seguidores": au.get("followers") or "",
                         "likes": pst.get("likeCount") or 0,
                         "comentarios": pst.get("commentCount") or 0,
                         "cerrado": cerrado(pst),
                         "quien_comento": ""}
            else:
                extra = enriquece(f["url"], key_sc)
            f["cerrado"] = "sí" if extra.get("cerrado") else ""
            f["quien_comento"] = extra.get("quien_comento", "")
            f.update({k: extra.get(k, "") for k in
                      ("autor_url","autor_pais","seguidores","likes","comentarios")})
            if extra.get("autor"): f["autor"] = extra["autor"]
            # El pais del autor manda sobre lo que se adivino del texto, salvo
            # cuando el texto apunta claro a uno de los cuatro mercados: un
            # indio que busca agencia PARA el mercado de EE.UU. sigue sirviendo.
            ap = extra.get("autor_pais") or ""
            if ap in MERCADOS and f.get("mercado") in ("", "?"):
                f["mercado"] = ap
            elif ap and ap not in MERCADOS and f.get("mercado") in ("", "?"):
                f["mercado"] = "fuera"
            if f.get("autor_url") and f.get("mercado") != "fuera":
                f.update(perfil(f["autor_url"], key_sc))
                pu = pais_de_ubicacion(f.get("ubicacion"))
                if pu: f["mercado"] = pu if pu in MERCADOS else "fuera"

    antes = len(filas)
    filas = [f for f in filas if f.get("mercado") != "fuera"]
    if antes != len(filas):
        desc["OTRO PAIS"] += antes - len(filas)
    antes = len(filas)
    filas = [f for f in filas if not f.get("cerrado")]
    if antes != len(filas):
        desc["YA CERRADO"] = antes - len(filas)

    # Menos comentarios = menos cola de agencias por delante. Es el mejor
    # criterio de orden que tenemos: un posteo con 110 comentarios ya se perdio.
    def oportunidad(f):
        c = f.get("comentarios")
        c = int(c) if str(c).isdigit() else 999
        return (f["fecha"], -c, f["score"])
    filas.sort(key=oportunidad, reverse=True)
    sello = datetime.now().strftime("%Y-%m-%d-%H%M")

    if filas:
        out = os.path.join(SALIDAS, "radar-%s.csv" % sello)
        with open(out, "w", encoding="utf-8", newline="") as fh:
            w = csv.DictWriter(fh, extrasaction="ignore", fieldnames=[
                "fecha","autor","autor_url","autor_pais","seguidores","likes",
                "comentarios","ubicacion","empresa","quien_comento",
                "titulo","extracto","mercado","score","url","id"])
            w.writeheader(); w.writerows(filas)
        print("\n%d prospecto(s) nuevo(s) -> %s\n" % (len(filas), out))
        for f in filas:
            print("  %s [%s] %s · %s coment. · %s" % (
                f["fecha"], f["mercado"], (f.get("autor") or "s/n")[:24],
                f.get("comentarios","?"), f["titulo"][:52]))
            if f.get("ubicacion") or f.get("empresa"):
                print("            %s%s" % (f.get("ubicacion",""),
                      " · " + f["empresa"] if f.get("empresa") else ""))
            print("            %s" % f["url"])
    else:
        print("\nSin prospectos nuevos en la ventana.\n")

    print("Descartados: " + ", ".join("%s %d" % (k, v) for k, v in desc.items() if v))
    print("Revisados: %d · costo aprox: US$ %.3f" % (len(crudos), costo))

    if not a.dry_run and filas:
        for f in filas: vistos[f["id"]] = f["fecha"]
        json.dump(vistos, open(VISTOS, "w", encoding="utf-8"), indent=0)
        print("Marcados como vistos (%d en total)." % len(vistos))

if __name__ == "__main__":
    main()
