#!/usr/bin/env python3
"""Tablero de vacantes — servidor local.

Sirve index.html y habla con Gmail por la API REST, con los refresh tokens que
ya dejó authorize.py en ~/.config/google-workspace-mcp/credentials/. No usa MCP:
una rutina que llama un conector MCP se cuelga en silencio, y aquí queremos algo
que siga sirviendo cuando la cuenta de Adglow ya no exista.

Solo stdlib. Escucha nada más en 127.0.0.1.
"""

import json
import os
import re
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

AQUI = os.path.dirname(os.path.abspath(__file__))
CREDS = os.path.expanduser("~/.config/google-workspace-mcp/credentials")
ESTADO = os.path.join(AQUI, "vacantes.json")

CUENTAS = ["tu-cuenta@tu-dominio.com"]  # una o varias, ya autorizadas con mcp/google-workspace/authorize.py

DIAS = 120
RUIDO = " ".join(
    "-from:" + d
    for d in (
        "security-noreply@linkedin.com",
        "no-reply@accounts.google.com",
        "noreply@github.com",
        "gemini-notes@google.com",
        "calendar-notification@google.com",
        "didi@mx.didiglobal.com",
        "toptal.com",
        # mercadotecnia y facturación de marcas que SÍ son vacantes en el tablero:
        # entran por consulta_dominios() (from:<dominio>) y la inundaban
        "engage.canva.com",
        "account.canva.com",
        "no-reply@canva.com",
    )
)
CONSULTA_CLAVES = (
    "newer_than:{}d {} (vacante OR postulación OR postulacion OR candidatura OR entrevista "
    "OR reclutador OR reclutamiento OR interview OR recruiter OR recruiting OR hiring "
    'OR "your application" OR "thank you for applying" OR "we received your application" '
    "OR oferta OR shortlist)"
).format(DIAS, RUIDO)

CACHE_SEG = 180
_cache = {"cuando": 0, "datos": None}
_cache_lock = threading.Lock()
_tokens = {}
_tok_lock = threading.Lock()
_estado_lock = threading.Lock()


# ---------------------------------------------------------------- credenciales
def cuentas_disponibles():
    out = []
    for c in CUENTAS:
        if os.path.exists(os.path.join(CREDS, c + ".json")):
            out.append(c)
    return out


def access_token(cuenta):
    """Devuelve un access token vivo, refrescándolo con el refresh token guardado."""
    with _tok_lock:
        t = _tokens.get(cuenta)
        if t and t["expira"] > time.time() + 60:
            return t["token"]

    ruta = os.path.join(CREDS, cuenta + ".json")
    with open(ruta, encoding="utf-8") as fh:
        cred = json.load(fh)

    for campo in ("client_id", "client_secret", "refresh_token"):
        if not cred.get(campo):
            raise RuntimeError("a %s le falta %s en su credencial" % (cuenta, campo))

    cuerpo = urllib.parse.urlencode(
        {
            "client_id": cred["client_id"],
            "client_secret": cred["client_secret"],
            "refresh_token": cred["refresh_token"],
            "grant_type": "refresh_token",
        }
    ).encode()
    req = urllib.request.Request(
        cred.get("token_uri") or "https://oauth2.googleapis.com/token",
        data=cuerpo,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        datos = json.load(r)

    tok = datos["access_token"]
    with _tok_lock:
        _tokens[cuenta] = {
            "token": tok,
            "expira": time.time() + int(datos.get("expires_in", 3600)),
        }
    return tok


def gmail(cuenta, ruta, params=None):
    url = "https://gmail.googleapis.com/gmail/v1/users/me/" + ruta
    if params:
        url += "?" + urllib.parse.urlencode(params, doseq=True)
    req = urllib.request.Request(
        url, headers={"Authorization": "Bearer " + access_token(cuenta)}
    )
    with urllib.request.urlopen(req, timeout=25) as r:
        return json.load(r)


# ------------------------------------------------------------------- consultas
def consulta_dominios(vacantes):
    dom = []
    for v in vacantes.values():
        for d in v.get("dominios") or []:
            if d not in dom:
                dom.append(d)
    if not dom:
        return None
    return "newer_than:{}d {} ({})".format(
        DIAS, RUIDO, " OR ".join("from:" + d for d in dom)
    )


def encabezado(msg, nombre):
    for h in (msg.get("payload") or {}).get("headers") or []:
        if h.get("name", "").lower() == nombre.lower():
            return h.get("value", "")
    return ""


def trae_mensajes(cuenta, consulta, tope=25):
    lista = gmail(
        cuenta, "messages", {"q": consulta, "maxResults": tope}
    ).get("messages") or []
    ids = [m["id"] for m in lista][:tope]
    if not ids:
        return []

    def uno(mid):
        m = gmail(
            cuenta,
            "messages/" + mid,
            {
                "format": "metadata",
                "metadataHeaders": ["Subject", "From", "Date", "To"],
            },
        )
        return {
            "id": m.get("id"),
            "threadId": m.get("threadId"),
            "cuenta": cuenta,
            "asunto": encabezado(m, "Subject"),
            "de": encabezado(m, "From"),
            "para": encabezado(m, "To"),
            "fecha": int(m.get("internalDate") or 0),
            "extracto": m.get("snippet") or "",
            "url": "https://mail.google.com/mail/u/?authuser={}#all/{}".format(
                urllib.parse.quote(cuenta), m.get("threadId") or m.get("id")
            ),
        }

    with ThreadPoolExecutor(max_workers=8) as pool:
        salida = []
        for r in pool.map(uno, ids):
            if r:
                salida.append(r)
    return salida


def junta_correo(vacantes, forzar=False):
    with _cache_lock:
        if (
            not forzar
            and _cache["datos"] is not None
            and time.time() - _cache["cuando"] < CACHE_SEG
        ):
            return _cache["datos"]

    consultas = [CONSULTA_CLAVES]
    qd = consulta_dominios(vacantes)
    if qd:
        consultas.append(qd)

    vistos = {}
    problemas = []
    cuentas = cuentas_disponibles()
    faltan = [c for c in CUENTAS if c not in cuentas]
    for c in faltan:
        problemas.append(
            {
                "cuenta": c,
                "error": "sin credencial en " + CREDS + ". Corre authorize.py para esa cuenta.",
            }
        )

    for cuenta in cuentas:
        for q in consultas:
            try:
                for m in trae_mensajes(cuenta, q):
                    vistos.setdefault(m["id"], m)
            except urllib.error.HTTPError as e:
                detalle = ""
                try:
                    detalle = json.load(e).get("error", {}).get("message", "")
                except Exception:
                    pass
                problemas.append(
                    {
                        "cuenta": cuenta,
                        "error": "HTTP %s %s" % (e.code, detalle or e.reason),
                    }
                )
                break
            except Exception as e:  # noqa: BLE001
                problemas.append({"cuenta": cuenta, "error": str(e)})
                break

    datos = {
        "mensajes": sorted(vistos.values(), key=lambda m: m["fecha"], reverse=True),
        "cuentas": cuentas,
        "problemas": problemas,
        "cuando": int(time.time() * 1000),
    }
    with _cache_lock:
        _cache["datos"] = datos
        _cache["cuando"] = time.time()
    return datos


# ---------------------------------------------------------------------- estado
def lee_estado():
    with _estado_lock:
        if not os.path.exists(ESTADO):
            return {}
        with open(ESTADO, encoding="utf-8") as fh:
            return json.load(fh)


def guarda_parche(vid, parche):
    permitidos = {"estado", "cv", "aplicada", "notas"}
    with _estado_lock:
        with open(ESTADO, encoding="utf-8") as fh:
            todo = json.load(fh)
        if vid not in todo:
            return None
        for k, v in parche.items():
            if k in permitidos:
                todo[vid][k] = v
        tmp = ESTADO + ".tmp"
        with open(tmp, "w", encoding="utf-8") as fh:
            json.dump(todo, fh, ensure_ascii=False, indent=2)
        os.replace(tmp, ESTADO)
        return todo[vid]


# ------------------------------------------------------------------ servidor
class Handler(BaseHTTPRequestHandler):
    server_version = "TableroVacantes/1.0"

    def log_message(self, fmt, *args):
        sys.stderr.write("  %s\n" % (fmt % args))

    def _envia(self, code, cuerpo, tipo="application/json; charset=utf-8"):
        if isinstance(cuerpo, (dict, list)):
            cuerpo = json.dumps(cuerpo, ensure_ascii=False).encode()
        elif isinstance(cuerpo, str):
            cuerpo = cuerpo.encode()
        self.send_response(code)
        self.send_header("Content-Type", tipo)
        self.send_header("Content-Length", str(len(cuerpo)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(cuerpo)

    def do_GET(self):
        ruta = urllib.parse.urlparse(self.path).path
        consulta = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)

        if ruta in ("/", "/index.html"):
            archivo = os.path.join(AQUI, "index.html")
            if not os.path.exists(archivo):
                return self._envia(404, "falta index.html", "text/plain; charset=utf-8")
            with open(archivo, "rb") as fh:
                return self._envia(200, fh.read(), "text/html; charset=utf-8")

        if ruta == "/api/estado":
            return self._envia(200, {"vacantes": lee_estado()})

        if ruta == "/api/correo":
            forzar = consulta.get("forzar", ["0"])[0] == "1"
            try:
                return self._envia(200, junta_correo(lee_estado(), forzar))
            except Exception as e:  # noqa: BLE001
                return self._envia(200, {"mensajes": [], "cuentas": [],
                                         "problemas": [{"cuenta": "-", "error": str(e)}],
                                         "cuando": int(time.time() * 1000)})

        return self._envia(404, {"error": "no existe"})

    def do_PUT(self):
        m = re.match(r"^/api/vacante/([A-Za-z0-9_.-]+)$", urllib.parse.urlparse(self.path).path)
        if not m:
            return self._envia(404, {"error": "no existe"})
        n = int(self.headers.get("Content-Length") or 0)
        if n > 65536:
            return self._envia(413, {"error": "demasiado grande"})
        try:
            parche = json.loads(self.rfile.read(n) or b"{}")
        except Exception:  # noqa: BLE001
            return self._envia(400, {"error": "JSON inválido"})
        fila = guarda_parche(m.group(1), parche)
        if fila is None:
            return self._envia(404, {"error": "esa vacante no está"})
        return self._envia(200, {"ok": True, "vacante": fila})


def main():
    puerto = int(os.environ.get("PUERTO", "8787"))
    disponibles = cuentas_disponibles()
    print("Tablero de vacantes")
    print("  estado:   " + ESTADO)
    print("  cuentas:  " + (", ".join(disponibles) if disponibles else "NINGUNA"))
    for c in CUENTAS:
        if c not in disponibles:
            print("  OJO: falta la credencial de " + c)
    print("  abre:     http://127.0.0.1:%d" % puerto)
    print("  (Ctrl+C para parar)")
    ThreadingHTTPServer(("127.0.0.1", puerto), Handler).serve_forever()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nlisto.")
