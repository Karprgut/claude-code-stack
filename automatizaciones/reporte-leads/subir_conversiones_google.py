#!/usr/bin/env python3
"""TBP · Sube a Google Ads los leads del CRM que vinieron de un clic de Search.

Por qué existe: la etiqueta del sitio solo cuenta un lead si el navegador cooperó
(consentimiento aceptado, gtag cargado, evento disparado). El CRM, en cambio, SIEMPRE
tiene el lead. Si el lead trae el id del clic de Google (gclid / gbraid / wbraid), se
sube como "conversión de clics" y Ads lo cuenta aunque la etiqueta haya fallado.
El 16-sep-2026 un lead de Search (una lead) quedó en cero en Ads por esto.

Fuente: contactos de Brevo de los últimos 90 días (ventana de la acción) en las listas
del formulario web. El id del clic sale de los atributos GCLID/GBRAID/WBRAID (los escribe
el servidor desde el 12-oct-2026) o, para leads anteriores, de LANDING_PAGE / REFERRER.

Destino: la acción "Lead CRM (Brevo)" (importación de clics, primaria, id <CONVERSION_ACTION_ID>, creada el
12-oct-2026 desde la interfaz; la "Zapier" original fue eliminada ese día).

Vía: Google Data Manager API (events:ingest). El 12-oct-2026 Google rechazó la vía vieja
(ConversionUploadService) con "new integrations must use the Data Manager API". Esta API
pide un scope propio en el token: https://www.googleapis.com/auth/datamanager. El refresh
token de flint/dashboard/.env.local solo trae `adwords`, así que hay que reautorizar con
los dos scopes (ver README) y tener habilitada "Data Manager API" en el proyecto de GCP.

Uso:  python3 subir_conversiones_google.py [--dry] [--desde 2026-09-01] [--todos]
  --dry    valida contra Google sin registrar nada (validateOnly)
  --todos  ignora la bitácora de ya-subidos (Google de todas formas deduplica por clic+acción)
Bitácora: out/.conversiones-google.json (email → qué se subió y cuándo).
"""
import argparse, json, os, re, sys, urllib.parse, urllib.request
from datetime import datetime, timedelta, timezone

DIR = os.path.dirname(os.path.abspath(__file__))
ESTADO = os.path.join(DIR, "out", ".conversiones-google.json")
ENV_ADS = os.environ.get("GOOGLE_ADS_ENV", os.path.expanduser("~/.config/tbp-leads/env"))  # lo llena authorize-google-ads.py
ENV_TBP = os.path.expanduser("~/.config/tbp-leads/env")
CUST = "<CUSTOMER_ID>"   # id de la cuenta de Google Ads, sin guiones
ACCION_ID = "<CONVERSION_ACTION_ID>"   # "Lead CRM (Brevo)" · UPLOAD_CLICKS · creada 12-oct-2026 (la vieja "Zapier" <CONVERSION_ACTION_ID> fue eliminada)
DM_URL = "https://datamanager.googleapis.com/v1/events:ingest"
SCOPE_DM = "https://www.googleapis.com/auth/datamanager"
LISTAS_WEB = {6, 7, 17}            # Latest Leads / TBP Studio / TBP - forms
VENTANA_DIAS = 90
CLICK_RE = r"[A-Za-z0-9_-]{8,200}"

def leer_env(path):
    d = {}
    if not os.path.exists(path): return d
    for l in open(path):
        l = l.strip()
        if l and not l.startswith("#") and "=" in l:
            k, v = l.split("=", 1); d[k] = v.strip().strip('"').strip("'")
    return d

def token_ads(E):
    body = urllib.parse.urlencode({"client_id": E["GOOGLE_ADS_CLIENT_ID"], "client_secret": E["GOOGLE_ADS_CLIENT_SECRET"],
                                   "refresh_token": E["GOOGLE_ADS_REFRESH_TOKEN"], "grant_type": "refresh_token"}).encode()
    t = json.load(urllib.request.urlopen(urllib.request.Request("https://oauth2.googleapis.com/token", data=body)))
    if SCOPE_DM not in (t.get("scope") or ""):
        sys.exit("el refresh token no trae el scope de Data Manager (" + SCOPE_DM + "). "
                 "Reautoriza con adwords + datamanager y actualiza GOOGLE_ADS_REFRESH_TOKEN. Scopes actuales: " + str(t.get("scope")))
    return t["access_token"]

def brevo_contactos(key, desde):
    out, offset = [], 0
    while True:
        u = f"https://api.brevo.com/v3/contacts?limit=500&offset={offset}&createdSince={urllib.parse.quote(desde)}&sort=desc"
        r = json.load(urllib.request.urlopen(urllib.request.Request(u, headers={"api-key": key, "accept": "application/json"})))
        lote = r.get("contacts", [])
        out += lote
        if len(lote) < 500: break
        offset += 500
    return out

def ids_de_url(url):
    out = {}
    if not url: return out
    for k in ("gclid", "gbraid", "wbraid"):
        m = re.search(r"[?&]" + k + "=(" + CLICK_RE + ")", url)
        if m: out[k] = m.group(1)
    # Brevo recorta LANDING_PAGE/REFERRER a 250 caracteres: un id que termina justo en el
    # corte está mutilado y Google lo rechazaría. Se descarta.
    if len(url) >= 250:
        for k, v in list(out.items()):
            if url.endswith(v): del out[k]
    return out

def click_id(attrs):
    # Preferencia: atributos propios (completos) → landing → referrer.
    ids = {}
    ids.update(ids_de_url(attrs.get("REFERRER") or ""))
    ids.update(ids_de_url(attrs.get("LANDING_PAGE") or ""))
    for k in ("GCLID", "GBRAID", "WBRAID"):
        v = (attrs.get(k) or "").strip()
        if v and re.fullmatch(CLICK_RE, v): ids[k.lower()] = v
    for k in ("gclid", "gbraid", "wbraid"):
        if ids.get(k): return k, ids[k]
    return None, None

def fecha_conversion(created_at):
    # Brevo: "2026-09-16T23:07:36.888+02:00" → Data Manager: ISO 8601 con offset, sin milisegundos
    dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
    return dt.strftime("%Y-%m-%dT%H:%M:%S") + dt.strftime("%z")[:3] + ":" + dt.strftime("%z")[3:]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry", action="store_true")
    ap.add_argument("--todos", action="store_true")
    ap.add_argument("--desde", default=None, help="YYYY-MM-DD (default: hoy - 90 días)")
    a = ap.parse_args()

    E = leer_env(ENV_ADS); T = leer_env(ENV_TBP)
    for k in ("GOOGLE_ADS_CLIENT_ID", "GOOGLE_ADS_CLIENT_SECRET", "GOOGLE_ADS_REFRESH_TOKEN", "GOOGLE_ADS_DEVELOPER_TOKEN", "GOOGLE_ADS_LOGIN_CUSTOMER_ID"):
        if k not in E: sys.exit(f"falta {k} en {ENV_ADS} · corre: python3 ~/.config/tbp-leads/authorize-google-ads.py")
    if "BREVO_API_KEY" not in T: sys.exit(f"falta BREVO_API_KEY en {ENV_TBP}")

    desde = a.desde or (datetime.now(timezone.utc) - timedelta(days=VENTANA_DIAS)).strftime("%Y-%m-%d")
    estado = json.load(open(ESTADO)) if os.path.exists(ESTADO) else {}

    contactos = brevo_contactos(T["BREVO_API_KEY"], desde + "T00:00:00Z")
    candidatos = []
    for c in contactos:
        if not (set(c.get("listIds", [])) & LISTAS_WEB): continue
        email = (c.get("email") or "").lower()
        if not email or (email in estado and not a.todos): continue
        # Leads de prueba del equipo (kar+prueba-…, "Prueba …"): nunca se suben a Google.
        attrs = c.get("attributes", {})
        if re.search(r"prueba|test", email) or re.search(r"^prueba\b", (attrs.get("NOMBRE") or ""), re.I):
            continue
        tipo, valor = click_id(c.get("attributes", {}))
        if not tipo: continue
        candidatos.append((email, c, tipo, valor))

    print(f"contactos desde {desde}: {len(contactos)} · con clic de Google y sin subir: {len(candidatos)}")
    if not candidatos: return

    eventos = []
    for email, c, tipo, valor in candidatos:
        eventos.append({"destinationReferences": ["ads"], "adIdentifiers": {tipo: valor},
                        "eventTimestamp": fecha_conversion(c["createdAt"]),
                        "conversionValue": 1.0, "currency": "MXN", "eventSource": "WEB"})
        print(f"  {c['createdAt'][:16]}  {email:40s} {tipo}={valor[:18]}…")

    H = {"Authorization": "Bearer " + token_ads(E), "Content-Type": "application/json"}
    body = {"destinations": [{"reference": "ads",
                              "loginAccount": {"accountType": "GOOGLE_ADS", "accountId": E["GOOGLE_ADS_LOGIN_CUSTOMER_ID"]},
                              "operatingAccount": {"accountType": "GOOGLE_ADS", "accountId": CUST},
                              "productDestinationId": ACCION_ID}],
            "events": eventos, "validateOnly": bool(a.dry)}
    req = urllib.request.Request(DM_URL, data=json.dumps(body).encode(), headers=H)
    try:
        r = json.load(urllib.request.urlopen(req))
    except urllib.error.HTTPError as e:
        sys.exit("Google respondió error: " + e.read().decode()[:1500])

    # La respuesta trae requestId; los rechazos por evento vienen en ingestionStatus/errorInfo cuando los hay.
    rechazados = {}
    for err in (r.get("errorInfo", {}).get("errorReasons") or r.get("errors") or []):
        idx = err.get("index") if isinstance(err, dict) else None
        rechazados[idx if idx is not None else -1] = json.dumps(err, ensure_ascii=False)[:300]
    print("respuesta:", json.dumps(r, ensure_ascii=False)[:400])
    ahora = datetime.now(timezone.utc).isoformat(timespec="seconds")
    ok = 0
    for i, (email, c, tipo, valor) in enumerate(candidatos):
        if i in rechazados:
            print(f"  RECHAZADO {email}: {rechazados[i]}")
            continue
        ok += 1
        if not a.dry:
            estado[email] = {"subido": ahora, "tipo": tipo, "valor": valor, "conversion": c["createdAt"]}
    print(("DRY RUN · validados" if a.dry else "subidos") + f": {ok} · rechazados: {len(rechazados)}")
    if not a.dry:
        os.makedirs(os.path.dirname(ESTADO), exist_ok=True)
        json.dump(estado, open(ESTADO, "w"), indent=1, ensure_ascii=False)

if __name__ == "__main__":
    main()
