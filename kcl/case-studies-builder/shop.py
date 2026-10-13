# -*- coding: utf-8 -*-
"""Cliente mínimo del Admin API de KCL. El token se renueva solo."""
import json, os, time, urllib.request, urllib.parse, mimetypes

ROOT = os.environ.get("KCL_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # carpeta con env.local / .env
API  = "2025-07"
_tok = {"v": None, "exp": 0}

def _env():
    e = {}
    for line in open(os.path.join(ROOT, "env.local")):
        if line.strip().startswith("#") or "=" not in line: continue
        k, v = line.split("=", 1)
        e[k.strip()] = v.strip().strip('"').strip("'")
    return e

E = _env()
DOMAIN = E["SHOPIFY_DOMAIN"].replace("https://","").rstrip("/")

def token():
    if _tok["v"] and _tok["exp"] > time.time() + 60: return _tok["v"]
    body = urllib.parse.urlencode({"grant_type":"client_credentials",
        "client_id":E["SHOPIFY_CLIENT_ID"], "client_secret":E["SHOPIFY_CLIENT_SECRET"]}).encode()
    r = urllib.request.Request(f"https://{DOMAIN}/admin/oauth/access_token", data=body,
        headers={"Content-Type":"application/x-www-form-urlencoded"})
    d = json.load(urllib.request.urlopen(r, timeout=30))
    _tok["v"], _tok["exp"] = d["access_token"], time.time()+d.get("expires_in",3600)
    return _tok["v"]

def usar_app_archivos():
    """La app por defecto (SHOPIFY_CLIENT_*) sólo tiene write_content.
    Para subir imágenes hay que usar la otra app del .env, SHOPIFY_KCL_*."""
    import urllib.parse as _u
    e2 = {}
    for line in open(os.path.join(ROOT, ".env")):
        if line.strip().startswith("#") or "=" not in line: continue
        k, v = line.split("=", 1); e2[k.strip()] = v.strip().strip('"').strip("'")
    body = _u.urlencode({"grant_type":"client_credentials",
        "client_id":e2["SHOPIFY_KCL_CLIENT_ID"], "client_secret":e2["SHOPIFY_KCL_CLIENT_SECRET"]}).encode()
    r = urllib.request.Request(f"https://{DOMAIN}/admin/oauth/access_token", data=body,
        headers={"Content-Type":"application/x-www-form-urlencoded"})
    d = json.load(urllib.request.urlopen(r, timeout=30))
    _tok["v"], _tok["exp"] = d["access_token"], time.time()+d.get("expires_in",3600)

def gql(query, variables=None):
    body = json.dumps({"query":query, "variables":variables or {}}).encode()
    r = urllib.request.Request(f"https://{DOMAIN}/admin/api/{API}/graphql.json", data=body,
        headers={"X-Shopify-Access-Token":token(), "Content-Type":"application/json"})
    d = json.load(urllib.request.urlopen(r, timeout=90))
    if "errors" in d: raise RuntimeError(json.dumps(d["errors"])[:400])
    return d["data"]

def rest(method, path, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    r = urllib.request.Request(f"https://{DOMAIN}/admin/api/{API}{path}", data=data, method=method,
        headers={"X-Shopify-Access-Token":token(), "Content-Type":"application/json", "Accept":"application/json"})
    with urllib.request.urlopen(r, timeout=90) as resp:
        t = resp.read().decode()
    return json.loads(t) if t.strip() else {}

# ── subida de archivos ────────────────────────────────────────────────
STAGED = """mutation($input:[StagedUploadInput!]!){
  stagedUploadsCreate(input:$input){
    stagedTargets{ url resourceUrl parameters{ name value } }
    userErrors{ field message } } }"""
FILECREATE = """mutation($files:[FileCreateInput!]!){
  fileCreate(files:$files){
    files{ id fileStatus alt ... on MediaImage { image { url width height } } }
    userErrors{ field message } } }"""

def subir(ruta, nombre, alt=""):
    mime = mimetypes.guess_type(nombre)[0] or "image/jpeg"
    size = str(os.path.getsize(ruta))
    d = gql(STAGED, {"input":[{"filename":nombre,"mimeType":mime,"resource":"FILE",
                               "httpMethod":"POST","fileSize":size}]})
    err = d["stagedUploadsCreate"]["userErrors"]
    if err: raise RuntimeError(str(err))
    tgt = d["stagedUploadsCreate"]["stagedTargets"][0]
    # multipart POST
    boundary = "----kclboundary%d" % int(time.time()*1000)
    parts = []
    for p in tgt["parameters"]:
        parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{p["name"]}"\r\n\r\n{p["value"]}\r\n')
    head = "".join(parts) + (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{nombre}"\r\n'
                             f'Content-Type: {mime}\r\n\r\n')
    body = head.encode() + open(ruta,"rb").read() + f"\r\n--{boundary}--\r\n".encode()
    r = urllib.request.Request(tgt["url"], data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
    urllib.request.urlopen(r, timeout=180).read()
    d = gql(FILECREATE, {"files":[{"originalSource":tgt["resourceUrl"],"contentType":"IMAGE","alt":alt[:512]}]})
    err = d["fileCreate"]["userErrors"]
    if err: raise RuntimeError(str(err))
    return d["fileCreate"]["files"][0]["id"]

def url_de(ids):
    """Espera a que Shopify procese y devuelve {id: url}."""
    out = {}
    pend = list(ids)
    for intento in range(24):
        if not pend: break
        d = gql("query($ids:[ID!]!){ nodes(ids:$ids){ ... on MediaImage { id fileStatus image { url } } } }",
                {"ids": pend[:50]})
        sig = []
        for n in d["nodes"]:
            if n and n.get("fileStatus")=="READY" and n.get("image"): out[n["id"]] = n["image"]["url"]
            elif n: sig.append(n["id"])
        pend = sig + pend[50:]
        if pend: time.sleep(2.5)
    return out
