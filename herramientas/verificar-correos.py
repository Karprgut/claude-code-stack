#!/usr/bin/env python3
"""Verifica correos con Bouncer o NeverBounce y los parte en limpios/dudosos/sucios.

Uso:
    python3 verificar-correos.py por_verificar.csv            # autodetecta proveedor
    python3 verificar-correos.py por_verificar.csv bouncer
    python3 verificar-correos.py por_verificar.csv neverbounce

Llaves (la que exista):
    ~/.config/bouncer/env       ->  BOUNCER_API_KEY=...
    ~/.config/neverbounce/env   ->  NEVERBOUNCE_API_KEY=...
"""
import json, sys, time, urllib.request, urllib.error, csv, pathlib

def leer_llave(carpeta, var):
    p = pathlib.Path.home() / f".config/{carpeta}/env"
    if not p.exists():
        return None
    for line in p.read_text().splitlines():
        if line.strip().startswith(var + "="):
            v = line.split("=", 1)[1].strip()
            if v:
                return v
    return None

def http(url, method="GET", body=None, headers=None):
    data = json.dumps(body).encode() if body is not None else None
    h = {"content-type": "application/json"}
    h.update(headers or {})
    r = urllib.request.Request(url, data=data, method=method, headers=h)
    try:
        with urllib.request.urlopen(r, timeout=180) as resp:
            raw = resp.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        sys.exit(f"Error {e.code} en {url}:\n{e.read().decode()[:500]}")

# ---------- Bouncer ----------
def via_bouncer(emails, key):
    API = "https://api.usebouncer.com/v1.1"
    H = {"x-api-key": key}
    print("proveedor: Bouncer")
    job = http(f"{API}/email/verify/batch", "POST",
               [{"email": e} for e in emails], H)
    bid = job.get("batchId")
    if not bid:
        sys.exit(f"No se creó el lote: {job}")
    print("batchId:", bid)
    while True:
        st = http(f"{API}/email/verify/batch/{bid}", headers=H)
        s = st.get("status")
        print(f"  estado: {s} ({st.get('percentage', 0)}%)")
        if s == "completed":
            break
        if s in ("failed",):
            sys.exit(f"Lote fallido: {st}")
        time.sleep(15)
    rows = http(f"{API}/email/verify/batch/{bid}/download?download=all", headers=H)
    # deliverable / risky / undeliverable / unknown
    mapa = {"deliverable": "valid", "undeliverable": "invalid",
            "risky": "catchall", "unknown": "unknown"}
    return [(r["email"], mapa.get(r.get("status"), r.get("status"))) for r in rows]

# ---------- NeverBounce ----------
def via_neverbounce(emails, key):
    API = "https://api.neverbounce.com/v4"
    print("proveedor: NeverBounce")
    job = http(f"{API}/jobs/create", "POST",
               {"key": key, "input_location": "supplied", "auto_start": 1,
                "auto_parse": 1, "input": [{"email": e} for e in emails]})
    jid = job.get("job_id")
    if not jid:
        sys.exit(f"No se creó el trabajo: {job}")
    print("job_id:", jid)
    while True:
        st = http(f"{API}/jobs/status", "POST", {"key": key, "job_id": jid})
        s = st.get("job_status")
        print(f"  estado: {s} ({st.get('percent_complete', 0)}%)")
        if s == "complete":
            break
        if s in ("failed", "under_review"):
            sys.exit(f"Trabajo detenido: {st}")
        time.sleep(15)
    res = http(f"{API}/jobs/results", "POST",
               {"key": key, "job_id": jid, "page": 1, "items_per_page": 10000})
    return [(r["data"]["email"], r["verification"]["result"]) for r in res.get("results", [])]

def main():
    src = sys.argv[1] if len(sys.argv) > 1 else "por_verificar.csv"
    forzado = sys.argv[2].lower() if len(sys.argv) > 2 else None

    kb = leer_llave("bouncer", "BOUNCER_API_KEY")
    kn = leer_llave("neverbounce", "NEVERBOUNCE_API_KEY")
    if forzado == "bouncer" and not kb: sys.exit("Falta BOUNCER_API_KEY en ~/.config/bouncer/env")
    if forzado == "neverbounce" and not kn: sys.exit("Falta NEVERBOUNCE_API_KEY en ~/.config/neverbounce/env")
    if not kb and not kn:
        sys.exit("No hay llave. Pon una en ~/.config/bouncer/env (BOUNCER_API_KEY=...) "
                 "o ~/.config/neverbounce/env (NEVERBOUNCE_API_KEY=...)")

    emails = [row[0].strip().lower() for row in csv.reader(open(src))
              if row and "@" in row[0]]
    emails = sorted(set(emails))
    print(f"{len(emails)} direcciones únicas a verificar")

    usar = forzado or ("bouncer" if kb else "neverbounce")
    pares = via_bouncer(emails, kb) if usar == "bouncer" else via_neverbounce(emails, kn)

    buckets = {}
    for email, estado in pares:
        buckets.setdefault(estado, []).append(email)

    print("\n--- resultado ---")
    for b, v in sorted(buckets.items(), key=lambda x: -len(x[1])):
        print(f"  {b:12s}: {len(v)}")

    limpios = buckets.get("valid", [])
    dudosos = buckets.get("catchall", []) + buckets.get("unknown", [])
    sucios  = buckets.get("invalid", []) + buckets.get("disposable", [])

    for nombre, datos in (("limpios.csv", limpios), ("dudosos.csv", dudosos), ("sucios.csv", sucios)):
        with open(nombre, "w") as f:
            f.write("email\n")
            for e in sorted(datos):
                f.write(e + "\n")
        print(f"  -> {nombre}: {len(datos)}")

    if limpios:
        print(f"\nTasa limpia: {len(limpios)/len(emails)*100:.1f}%")
    print("Se manda sólo limpios.csv. Los dudosos se deciden aparte; los sucios nunca.")

if __name__ == "__main__":
    main()
