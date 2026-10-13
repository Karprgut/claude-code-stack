#!/usr/bin/env python3
"""Renueva el GOOGLE_ADS_REFRESH_TOKEN de flint/dashboard/.env.local con DOS scopes:
Google Ads (adwords) + Data Manager (datamanager).

    python3 ~/.config/tbp-leads/authorize-google-ads.py

Por qué: ~/Trabajo/Karma\ Creative\ Lab/tbp-leads/subir_conversiones_google.py sube los leads del CRM de TBP a
Google Ads por la Data Manager API, y ese token solo traía el scope de adwords (12-oct-2026).
El mismo token lo usan google_oct26.py y Flint, así que conserva el scope de adwords.
Si Google devuelve redirect_uri_mismatch, el client id es de tipo "aplicación web": registra
http://localhost:3000/oauth2callback en sus URIs autorizadas en console.cloud.google.com.

Mismo patrón que los autorizadores de Analytics y Workspace: escribe el token
en el .env del perfil (nunca lo imprime) y deja el resto del archivo intacto.
Útil cuando el MCP arranca pero la API responde 'invalid_grant: Token has been
expired or revoked'.
"""
import http.server, json, os, re, secrets, subprocess, sys
import urllib.error, urllib.parse, urllib.request, webbrowser

PROFILES = {
    "tbp": os.path.expanduser("~/.config/tbp-leads/env"),
}
FLINT_ENV = os.path.expanduser("~/Trabajo/flint/dashboard/.env.local")  # de aquí se copian client id/secret/developer token
PORT = int(os.environ.get("GA_OAUTH_PORT", "3000"))
REDIRECT = f"http://localhost:{PORT}/oauth2callback"
SCOPE = "https://www.googleapis.com/auth/adwords https://www.googleapis.com/auth/datamanager"


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
    lines = open(path, encoding="utf-8").read().splitlines() if os.path.exists(path) else []
    out, done = [], False
    for line in lines:
        if re.match(rf"\s*{key}\s*=", line):
            out.append(f"{key}={value}"); done = True
        else:
            out.append(line)
    if not done:
        if out and out[-1].strip():
            out.append("")
        out.append(f"{key}={value}")
    old = os.umask(0o077)
    try:
        tmp = path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as fh:
            fh.write("\n".join(out) + "\n")
        os.replace(tmp, path)
    finally:
        os.umask(old)


def check_port_free():
    import socket
    s = socket.socket()
    try:
        s.settimeout(0.4); busy = s.connect_ex(("127.0.0.1", PORT)) == 0
    finally:
        s.close()
    if busy:
        try:
            who = subprocess.run(["lsof", "-nP", f"-iTCP:{PORT}", "-sTCP:LISTEN"],
                                 capture_output=True, text=True, timeout=5).stdout.strip()
        except Exception:
            who = ""
        print(f"\n✗ El puerto {PORT} está ocupado.\n")
        print(who + "\n" if who else "")
        print("Apaga ese servidor (Ctrl+C en su Terminal) y repite el comando.")
        sys.exit(1)


def main():
    profile = sys.argv[1] if len(sys.argv) > 1 else "tbp"
    if profile not in PROFILES:
        sys.exit("uso: authorize-google-ads.py [tbp]")
    envfile = PROFILES[profile]
    if not os.access(envfile, os.R_OK):
        sys.exit(f"✗ no puedo leer {envfile}")
    check_port_free()

    env = read_env(envfile)
    # El client id (proyecto 783526646437, donde está habilitada la Data Manager API) es el de
    # Flint; se copia una vez al env de TBP para no depender de ese archivo después.
    flint = read_env(FLINT_ENV)
    for k in ("GOOGLE_ADS_CLIENT_ID", "GOOGLE_ADS_CLIENT_SECRET", "GOOGLE_ADS_DEVELOPER_TOKEN"):
        if not env.get(k) and flint.get(k):
            write_var(envfile, k, flint[k]); env[k] = flint[k]
    cid, csec = env.get("GOOGLE_ADS_CLIENT_ID"), env.get("GOOGLE_ADS_CLIENT_SECRET")
    if not cid or not csec:
        sys.exit(f"✗ falta CLIENT_ID/CLIENT_SECRET en {envfile} y en {FLINT_ENV}")

    state = secrets.token_urlsafe(16)
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode({
        "client_id": cid, "redirect_uri": REDIRECT, "response_type": "code",
        "scope": SCOPE, "access_type": "offline", "prompt": "consent", "state": state})
    result = {}

    class H(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            if not self.path.startswith("/oauth2callback"):
                self.send_response(404); self.end_headers(); return
            q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            self.send_response(200); self.send_header("Content-Type", "text/html; charset=utf-8"); self.end_headers()
            if q.get("state", [None])[0] != state:
                self.wfile.write(b"state invalido"); result["error"] = "state"
            elif "error" in q:
                self.wfile.write(f"Google devolvio: {q['error'][0]}".encode()); result["error"] = q["error"][0]
            else:
                self.wfile.write("Listo. Cierra esta pestana y vuelve a la terminal.".encode())
                result["code"] = q.get("code", [None])[0]
        def log_message(self, *a): pass

    srv = http.server.HTTPServer(("localhost", PORT), H)
    print(f"\nPerfil: {profile}   .env: {envfile}")
    print("\nAbre esta URL con la cuenta de Google Ads que administra la cuenta de TBP (<CUSTOMER_ID>):\n")
    print(url, "\n")
    try: webbrowser.open(url)
    except Exception: pass
    while not result:
        srv.handle_request()
    srv.server_close()
    if "code" not in result:
        sys.exit("✗ no se obtuvo el permiso: " + result.get("error", "desconocido"))

    body = urllib.parse.urlencode({"code": result["code"], "client_id": cid,
        "client_secret": csec, "redirect_uri": REDIRECT,
        "grant_type": "authorization_code"}).encode()
    try:
        with urllib.request.urlopen(urllib.request.Request(
                "https://oauth2.googleapis.com/token", data=body)) as r:
            tok = json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit("✗ error al canjear el permiso: " + e.read().decode())
    rt = tok.get("refresh_token")
    if not rt:
        sys.exit("✗ Google no devolvió refresh_token. Quita el acceso en "
                 "https://myaccount.google.com/permissions y reintenta.")
    # Antes de guardar: ¿esta cuenta ve el MCC de TBP? El 12-oct-2026 se autorizó con la
    # cuenta equivocada (Google preselecciona la predeterminada de Chrome) y el token nuevo
    # dejó sin TBP a Flint y al subidor. Si no lo ve, no se escribe nada.
    # TBP cuelga de dos MCC: "Karma Creative Lab" <MCC_ID> (cuenta admin de Karma) y
    # <MCC_ID> (velox, la que usa Flint). Se acepta cualquiera y se guarda cuál fue.
    MCCS_TBP = ("<MCC_ID>", "<MCC_ID>")
    try:
        hdr = {"Authorization": "Bearer " + tok["access_token"],
               "developer-token": env.get("GOOGLE_ADS_DEVELOPER_TOKEN", "")}
        with urllib.request.urlopen(urllib.request.Request(
                "https://googleads.googleapis.com/v22/customers:listAccessibleCustomers", headers=hdr)) as r:
            vistos = [x.split("/")[-1] for x in json.load(r).get("resourceNames", [])]
    except urllib.error.HTTPError as e:
        sys.exit("✗ no pude listar las cuentas de Google Ads de esa cuenta: " + e.read().decode()[:300])
    mcc = next((m for m in MCCS_TBP if m in vistos), None)
    if not mcc:
        sys.exit(f"✗ La cuenta con la que autorizaste no administra ningún MCC de TBP {MCCS_TBP}; ve: {vistos}.\n"
                 "  No se guardó nada. Repite y en el selector de Google elige la cuenta admin de Karma.")
    write_var(envfile, "GOOGLE_ADS_LOGIN_CUSTOMER_ID", mcc)
    write_var(envfile, "GOOGLE_ADS_REFRESH_TOKEN", rt)
    print(f"\n✅ GOOGLE_ADS_REFRESH_TOKEN actualizado en {envfile} (scopes: adwords + datamanager · MCC {mcc})")
    print("   Prueba: python3 ~/Trabajo/Karma\ Creative\ Lab/tbp-leads/subir_conversiones_google.py --dry --desde 2026-09-01")


if __name__ == "__main__":
    main()
