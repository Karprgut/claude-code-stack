#!/usr/bin/env python3
"""Conecta UNA cuenta de Google al MCP de Workspace (Gmail, Drive, Calendar,
Docs, Sheets, Slides, Tasks), con permisos de lectura y escritura.

    python3 ~/.config/google-workspace-mcp/authorize.py correo@dominio.com

Se corre una vez por cuenta. Cada cuenta queda como un archivo de credenciales
en ~/.config/google-workspace-mcp/credentials/, y el mismo servidor MCP atiende
a todas: la cuenta se elige por herramienta (parámetro user_google_email).

Reutiliza el cliente OAuth de Google Ads/Analytics (redirect en localhost:3000,
ya registrado). El token nunca se imprime.
"""
import http.server
import json
import os
import re
import secrets
import shutil
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from datetime import datetime, timedelta, timezone

DIR = os.path.expanduser("~/.config/google-workspace-mcp")
CREDS_DIR = os.path.join(DIR, "credentials")
BASE_ENV = os.environ.get("GOOGLE_WORKSPACE_ENV_FILE",
                          os.path.expanduser("~/Trabajo/Karma Creative Lab/google-ads-karma/.env"))
PORT = int(os.environ.get("GA_OAUTH_PORT", "3000"))
REDIRECT = f"http://localhost:{PORT}/oauth2callback"

SCOPES = [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "openid",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.labels",
    "https://www.googleapis.com/auth/gmail.settings.basic",
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/documents",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/presentations",
    "https://www.googleapis.com/auth/tasks",
]

# Prueba de humo por servicio: si una API no está habilitada en el proyecto de
# Cloud, se ve aquí y no tres días después.
PROBES = [
    ("Gmail", "https://gmail.googleapis.com/gmail/v1/users/me/profile"),
    ("Drive", "https://www.googleapis.com/drive/v3/about?fields=user"),
    ("Calendar", "https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1"),
    ("Tasks", "https://tasks.googleapis.com/tasks/v1/users/@me/lists?maxResults=1"),
    ("Sheets", "https://sheets.googleapis.com/$discovery/rest?version=v4"),
    ("Docs", "https://docs.googleapis.com/$discovery/rest?version=v1"),
    ("Slides", "https://slides.googleapis.com/$discovery/rest?version=v1"),
]


def read_env(path):
    env = {}
    try:
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                m = re.match(r"\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$", line)
                if m:
                    env[m.group(1)] = m.group(2).strip("\"'")
    except FileNotFoundError:
        pass
    return env


def check_port_free():
    import socket
    s = socket.socket()
    try:
        s.settimeout(0.4)
        busy = s.connect_ex(("127.0.0.1", PORT)) == 0
    finally:
        s.close()
    if not busy:
        return
    try:
        who = subprocess.run(["lsof", "-nP", f"-iTCP:{PORT}", "-sTCP:LISTEN"],
                             capture_output=True, text=True, timeout=5).stdout.strip()
    except Exception:
        who = ""
    print(f"\n✗ El puerto {PORT} está ocupado; ahí debe aterrizar la respuesta de Google.\n")
    if who:
        print(who + "\n")
    print("Apaga ese servidor (Ctrl+C en su Terminal) y repite el comando.")
    sys.exit(1)


def oauth_dance(cid, csec, hint):
    state = secrets.token_urlsafe(16)
    auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode({
        "client_id": cid, "redirect_uri": REDIRECT, "response_type": "code",
        "scope": " ".join(SCOPES), "access_type": "offline", "prompt": "consent",
        "include_granted_scopes": "true", "login_hint": hint, "state": state,
    })
    result = {}

    class Handler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            if not self.path.startswith("/oauth2callback"):
                self.send_response(404); self.end_headers(); return
            q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            if q.get("state", [None])[0] != state:
                self.wfile.write("state invalido, repite el comando.".encode())
                result["error"] = "state mismatch"
            elif "error" in q:
                self.wfile.write(f"Google devolvio: {q['error'][0]}".encode())
                result["error"] = q["error"][0]
            else:
                self.wfile.write("Listo. Cierra esta pestana y vuelve a la terminal.".encode())
                result["code"] = q.get("code", [None])[0]

        def log_message(self, *a):
            pass

    srv = http.server.HTTPServer(("localhost", PORT), Handler)
    print(f"\nAbre esta URL e inicia sesión como {hint}")
    print("(si Google ya tiene otra sesión activa, elige «Usar otra cuenta»):\n")
    print(auth_url, "\n")
    try:
        webbrowser.open(auth_url)
    except Exception:
        pass
    while not result:
        srv.handle_request()
    srv.server_close()
    if "code" not in result:
        sys.exit("✗ no se obtuvo el permiso: " + result.get("error", "desconocido"))

    body = urllib.parse.urlencode({
        "code": result["code"], "client_id": cid, "client_secret": csec,
        "redirect_uri": REDIRECT, "grant_type": "authorization_code",
    }).encode()
    try:
        with urllib.request.urlopen(
                urllib.request.Request("https://oauth2.googleapis.com/token", data=body)) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit("✗ error al canjear el permiso: " + e.read().decode())


def api_get(url, token):
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return True, json.load(r)
    except urllib.error.HTTPError as e:
        try:
            msg = json.load(e).get("error", {}).get("message", "")
        except Exception:
            msg = e.reason
        return False, msg
    except Exception as e:
        return False, str(e)


def main():
    if len(sys.argv) < 2 or "@" not in sys.argv[1]:
        sys.exit(f"uso: python3 {os.path.basename(__file__)} correo@dominio.com")
    email = sys.argv[1].strip().lower()
    check_port_free()

    env = read_env(BASE_ENV)
    cid = env.get("GOOGLE_WORKSPACE_CLIENT_ID") or env.get("GOOGLE_ADS_CLIENT_ID")
    csec = env.get("GOOGLE_WORKSPACE_CLIENT_SECRET") or env.get("GOOGLE_ADS_CLIENT_SECRET")
    if not cid or not csec:
        sys.exit(f"✗ no encontré CLIENT_ID/CLIENT_SECRET en {BASE_ENV}")

    tok = oauth_dance(cid, csec, email)
    access, refresh = tok.get("access_token"), tok.get("refresh_token")
    if not refresh:
        sys.exit("✗ Google no devolvió refresh_token. Quita el acceso en "
                 "https://myaccount.google.com/permissions y reintenta.")

    ok, info = api_get("https://www.googleapis.com/oauth2/v3/userinfo", access)
    real = (info.get("email") if ok and isinstance(info, dict) else None) or email
    if real.lower() != email:
        print(f"\n⚠ Autorizaste con {real}, no con {email}. Guardo {real}.")
    real = real.lower()

    os.makedirs(CREDS_DIR, mode=0o700, exist_ok=True)
    path = os.path.join(CREDS_DIR, urllib.parse.quote(real, safe="@._-") + ".json")
    expiry = (datetime.now(timezone.utc) + timedelta(seconds=int(tok.get("expires_in", 3600)))
              ).replace(tzinfo=None).isoformat()
    data = {
        "token": access, "refresh_token": refresh,
        "token_uri": "https://oauth2.googleapis.com/token",
        "client_id": cid, "client_secret": csec,
        "scopes": tok.get("scope", " ".join(SCOPES)).split(), "expiry": expiry,
    }
    old = os.umask(0o077)
    try:
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(data, fh, indent=2)
    finally:
        os.umask(old)
    print(f"\n✅ Cuenta conectada: {real}\n   credenciales: {path}")

    print("\nProbando cada servicio con esta cuenta:")
    faltan = []
    for name, url in PROBES:
        ok, res = api_get(url, access)
        if ok:
            print(f"   ✓ {name}")
        else:
            print(f"   ✗ {name}: {str(res)[:150]}")
            faltan.append(name)
    if faltan:
        print("\n⚠ Los servicios con ✗ casi siempre son una API sin habilitar en el "
              "proyecto de Google Cloud. Habilítala y vuelve a correr este comando.")

    cuentas = sorted(f[:-5] for f in os.listdir(CREDS_DIR) if f.endswith(".json"))
    print("\nCuentas conectadas hasta ahora: " + ", ".join(urllib.parse.unquote(c) for c in cuentas))

    name = "google-workspace"
    if shutil.which("claude"):
        listing = subprocess.run(["claude", "mcp", "list"], capture_output=True, text=True,
                                 cwd=os.path.expanduser("~")).stdout
        if re.search(rf"^{name}:", listing, re.M):
            print(f"✓ El servidor {name} ya estaba registrado en Claude Code.")
        else:
            r = subprocess.run(["claude", "mcp", "add", name, "--scope", "user", "--",
                                f"{DIR}/run.sh"], capture_output=True, text=True,
                               cwd=os.path.expanduser("~"))
            print("✓ Registrado en Claude Code como " + name if r.returncode == 0
                  else "⚠ " + r.stderr.strip())
    print("\n→ Reinicia Claude Code cuando termines de conectar las cuentas.")


if __name__ == "__main__":
    main()
