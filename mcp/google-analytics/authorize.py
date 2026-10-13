#!/usr/bin/env python3
"""Da de alta un PERFIL del MCP de Google Analytics (una cuenta de Google c/u).

    python3 ~/.config/google-analytics-mcp/authorize.py <perfil>

Ejemplos:  authorize.py kcl        → cuenta principal (.env de Trabajo/Karma Creative Lab/google-ads-karma)
           authorize.py kabrita    → crea ~/.config/google-analytics-mcp/env.kabrita
           authorize.py tbp        → idem, con otra cuenta de Google

Qué hace, en orden:
  1. Verifica que el puerto del redirect esté libre.
  2. Abre el navegador para que autorices con la cuenta que tenga acceso a GA4.
  3. Guarda el refresh token (scope analytics.readonly) en el .env del perfil.
  4. Lista las propiedades GA4 que ve esa cuenta.
  5. Registra el servidor en Claude Code como google-analytics-<perfil>.

El token nunca se imprime en pantalla.
"""
import http.server
import json
import os
import re
import secrets
import shutil
import subprocess
import sys
import urllib.parse
import urllib.request
import webbrowser

DIR = os.path.expanduser("~/.config/google-analytics-mcp")
# Perfiles que viven en el .env de un proyecto (misma convención que el MCP de Ads).
PROJECT_PROFILES = {
    "kcl": os.path.expanduser("~/Trabajo/Karma Creative Lab/google-ads-karma/.env"),
    "adglow": os.path.expanduser("~/Trabajo/adglow/adglow/.env.local"),
}
BASE_ENV = PROJECT_PROFILES["kcl"]  # de aquí se heredan CLIENT_ID / CLIENT_SECRET
PORT = int(os.environ.get("GA_OAUTH_PORT", "3000"))
REDIRECT = f"http://localhost:{PORT}/oauth2callback"
SCOPE = "https://www.googleapis.com/auth/analytics.readonly"
VENV_PY = os.path.expanduser(
    "~/Library/Application Support/pipx/venvs/analytics-mcp/bin/python")


def env_path(profile):
    return PROJECT_PROFILES.get(profile) or os.path.join(DIR, f"env.{profile}")


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


def write_var(path, key, value):
    """Reemplaza (o agrega) key=value conservando el resto del archivo."""
    lines = []
    if os.path.exists(path):
        with open(path, encoding="utf-8") as fh:
            lines = fh.read().splitlines()
    out, done = [], False
    for line in lines:
        if re.match(rf"\s*{key}\s*=", line):
            out.append(f"{key}={value}")
            done = True
        else:
            out.append(line)
    if not done:
        if out and out[-1].strip():
            out.append("")
        out.append("# GA4 MCP (scope analytics.readonly) - generado por authorize.py")
        out.append(f"{key}={value}")
    old_mask = os.umask(0o077)
    try:
        tmp = path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as fh:
            fh.write("\n".join(out) + "\n")
        os.replace(tmp, path)
    finally:
        os.umask(old_mask)


def check_port_free():
    """Si en localhost:PORT ya vive otro server (p.ej. `next dev`), la respuesta
    de Google aterriza ahí y sale un Internal Server Error que no es de Google."""
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
    print(f"\n✗ El puerto {PORT} está ocupado. Google no podría devolverte el permiso aquí.\n")
    if who:
        print(who + "\n")
    arg = sys.argv[1] if len(sys.argv) > 1 else "kcl"
    print("Qué hacer:")
    print("  1) Apaga ese servidor (Ctrl+C en su Terminal) y repite este comando.")
    print("  2) O usa otro puerto, si ya registraste su URI de redirección en Google Cloud:")
    print(f"       GA_OAUTH_PORT=8765 python3 {os.path.abspath(__file__)} {arg}")
    sys.exit(1)


def oauth_dance(cid, csec):
    state = secrets.token_urlsafe(16)
    auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode({
        "client_id": cid, "redirect_uri": REDIRECT, "response_type": "code",
        "scope": SCOPE, "access_type": "offline", "prompt": "consent", "state": state,
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
                self.wfile.write("state invalido, vuelve a correr el script.".encode())
                result["error"] = "state mismatch"
            elif "error" in q:
                self.wfile.write(f"Google devolvio: {q['error'][0]}".encode())
                result["error"] = q["error"][0]
            else:
                self.wfile.write(
                    "Listo. Ya puedes cerrar esta pestana y volver a la terminal.".encode())
                result["code"] = q.get("code", [None])[0]

        def log_message(self, *a):
            pass

    srv = http.server.HTTPServer(("localhost", PORT), Handler)
    print("\nAbre esta URL con la cuenta de Google que tiene acceso a esas propiedades GA4:\n")
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
            tok = json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit("✗ error al canjear el permiso: " + e.read().decode())
    rt = tok.get("refresh_token")
    if not rt:
        sys.exit("✗ Google no devolvió refresh_token. Quita el acceso de la app en "
                 "https://myaccount.google.com/permissions y reintenta.")
    return rt


def list_properties(profile):
    """Muestra qué propiedades GA4 alcanza el perfil recién autorizado."""
    if not os.path.exists(VENV_PY):
        return
    code = (
        "import google.auth\n"
        "from google.analytics import admin_v1beta as a\n"
        "c,_=google.auth.default(scopes=['https://www.googleapis.com/auth/analytics.readonly'])\n"
        "cl=a.AnalyticsAdminServiceClient(credentials=c)\n"
        "n=0\n"
        "for acc in cl.list_account_summaries():\n"
        "    print('● '+acc.display_name)\n"
        "    for p in acc.property_summaries:\n"
        "        n+=1; print('   - %s  (%s)'%(p.display_name,p.property))\n"
        "print('\\nPropiedades visibles: %d'%n)\n"
    )
    env = dict(os.environ,
               GOOGLE_APPLICATION_CREDENTIALS=os.path.join(DIR, f"adc-{profile}.json"))
    print("\nPropiedades GA4 que ve esta cuenta:\n")
    r = subprocess.run([VENV_PY, "-c", code], env=env, capture_output=True, text=True)
    print(r.stdout.strip() or ("(no pude listarlas)\n" + r.stderr.strip()[-600:]))


def register_in_claude(profile):
    name = f"google-analytics-{profile}"
    if not shutil.which("claude"):
        print(f"\n⚠ No encontré el comando `claude`. Registra a mano:\n"
              f"   claude mcp add {name} --scope user -- {DIR}/run.sh {profile}")
        return
    existing = subprocess.run(["claude", "mcp", "list"], capture_output=True,
                              text=True, cwd=os.path.expanduser("~")).stdout
    if re.search(rf"^{re.escape(name)}:", existing, re.M):
        print(f"\n✓ El servidor {name} ya estaba registrado en Claude Code.")
        return
    r = subprocess.run(["claude", "mcp", "add", name, "--scope", "user", "--",
                        f"{DIR}/run.sh", profile],
                       capture_output=True, text=True, cwd=os.path.expanduser("~"))
    print(f"\n{'✓ Registrado en Claude Code como ' + name if r.returncode == 0 else '⚠ ' + r.stderr.strip()}")


def guard_existing(profile, envfile):
    """Evita el error clásico: correr el script varias veces con el MISMO nombre
    de perfil pisa el permiso anterior y solo sobrevive la última cuenta."""
    env = read_env(envfile)
    if not env.get("GOOGLE_ANALYTICS_REFRESH_TOKEN"):
        return
    if "--force" in sys.argv:
        return
    print(f"\n⚠ El perfil '{profile}' YA tiene una cuenta conectada ({envfile}).")
    print("  Si sigues, la reemplazas y pierdes el acceso de esa cuenta.")
    print("  Si lo que quieres es AGREGAR otra cuenta, cancela y usa otro nombre:")
    print(f"      python3 {os.path.abspath(__file__)} <otro-nombre>\n")
    if not sys.stdin.isatty():
        sys.exit("cancelado (agrega --force si de verdad quieres reemplazarlo)")
    try:
        r = input("¿Reemplazar la cuenta de este perfil? escribe SI para continuar: ")
    except EOFError:
        r = ""
    if r.strip().lower() not in ("si", "sí"):
        sys.exit("cancelado, no toqué nada.")


def main():
    if len(sys.argv) < 2:
        sys.exit(f"uso: python3 {os.path.basename(__file__)} <perfil>   "
                 f"(p.ej. kcl, kabrita, tbp, amperson)")
    profile = sys.argv[1]
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,30}", profile):
        sys.exit("el perfil solo admite minúsculas, números y guiones")

    check_port_free()
    envfile = env_path(profile)
    guard_existing(profile, envfile)
    base = read_env(BASE_ENV)
    env = read_env(envfile)
    cid = (env.get("GOOGLE_ANALYTICS_CLIENT_ID") or env.get("GOOGLE_ADS_CLIENT_ID")
           or base.get("GOOGLE_ADS_CLIENT_ID"))
    csec = (env.get("GOOGLE_ANALYTICS_CLIENT_SECRET") or env.get("GOOGLE_ADS_CLIENT_SECRET")
            or base.get("GOOGLE_ADS_CLIENT_SECRET"))
    if not cid or not csec:
        sys.exit(f"✗ no encontré CLIENT_ID/CLIENT_SECRET (ni en {envfile} ni en {BASE_ENV})")

    print(f"\nPerfil: {profile}")
    print(f"Credenciales se guardarán en: {envfile}")
    if not os.path.exists(envfile):
        write_var(envfile, "GOOGLE_ANALYTICS_CLIENT_ID", cid)
        write_var(envfile, "GOOGLE_ANALYTICS_CLIENT_SECRET", csec)

    rt = oauth_dance(cid, csec)
    write_var(envfile, "GOOGLE_ANALYTICS_REFRESH_TOKEN", rt)
    print(f"\n✅ Permiso guardado en {envfile}")

    try:  # arranque en seco: genera el adc-<perfil>.json que usa el MCP
        subprocess.run([os.path.join(DIR, "run.sh"), profile], capture_output=True,
                       input="", text=True, timeout=20)
    except subprocess.TimeoutExpired:
        pass
    list_properties(profile)
    register_in_claude(profile)
    print("\n→ Reinicia Claude Code para que aparezca la conexión nueva.")


if __name__ == "__main__":
    main()
