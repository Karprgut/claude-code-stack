#!/usr/bin/env python3
"""Construye ~/.secrets a partir de los .env vivos.

Diseno:
  tenants/<inquilino>.env   valores compartidos por 2+ archivos del inquilino con valor identico
  files/<slug>.env          valores propios de ese archivo (exclusivos o divergentes)
  templates/<slug>.tmpl     el archivo ORIGINAL con ${VAR} en lugar del valor
                            (preserva comentarios, orden y lineas en blanco tal cual)
  manifest.tsv              slug -> inquilino -> ruta destino

`secret sync` renderiza template + vault y reproduce el archivo byte por byte.
"""
import os, pathlib, re, shutil, sys, json

HOME = pathlib.Path.home()
VAULT = HOME / ".secrets"

FILES = [
    # (slug, ruta relativa a $HOME, inquilino)
    ("empresa-a-env",   "Trabajo/empresa-a/.env",                 "empresa-a"),
    ("empresa-a-local", "Trabajo/empresa-a/.env.local",           "empresa-a"),
    ("empresa-b-dash",  "Trabajo/empresa-b/dashboard/.env.local", "empresa-b"),
    ("suelto",          "Trabajo/herramienta-suelta/.env",        "huerfano"),
]

ASSIGN = re.compile(r'^(\s*)(export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$')

def split_value(raw):
    """raw = todo despues del '='. Devuelve (valor_limpio, plantilla_del_raw)."""
    s = raw.rstrip("\r")
    m = re.match(r'^(["\'])(.*)\1(.*)$', s)
    if m:
        inner = m.group(2)
        return inner, f'{m.group(1)}\x00{m.group(1)}{m.group(3)}'
    # valor sin comillas: un "#" precedido de espacio abre comentario en linea
    # (misma regla que dotenv), asi que NO forma parte del valor
    body, comment = s, ""
    m2 = re.search(r'\s#', s)
    if m2:
        body, comment = s[:m2.start()], s[m2.start():]
    inner = body.strip()
    if inner == "":
        return "", s
    i = s.index(inner)
    return inner, s[:i] + "\x00" + s[i+len(inner):]

problems, parsed = [], {}
for slug, rel, tenant in FILES:
    p = HOME / rel
    if not p.exists():
        problems.append(f"{slug}: no existe {rel}")
        continue
    text = p.read_text(errors="replace")
    lines = text.split("\n")
    vals, tmpl = {}, []
    for ln in lines:
        m = ASSIGN.match(ln)
        if not m or ln.lstrip().startswith("#"):
            tmpl.append(ln); continue
        ws, exp, key, raw = m.group(1), m.group(2) or "", m.group(3), m.group(4)
        # deteccion de valor multilinea (comilla abierta sin cerrar)
        if raw.count('"') == 1 or raw.count("'") == 1:
            problems.append(f"{slug}: {key} parece valor multilinea, se deja literal")
            tmpl.append(ln); continue
        v, rawtmpl = split_value(raw)
        vals[key] = v
        tmpl.append(f"{ws}{exp}{key}=" + rawtmpl.replace("\x00", "${" + key + "}"))
    parsed[slug] = dict(rel=rel, tenant=tenant, vals=vals,
                        tmpl="\n".join(tmpl), ends_nl=text.endswith("\n"))

# --- reparto tenant vs archivo ---
tenant_vals, file_vals = {}, {}
tenants = sorted({d["tenant"] for d in parsed.values()})
for t in tenants:
    slugs = [s for s, d in parsed.items() if d["tenant"] == t]
    keys = sorted({k for s in slugs for k in parsed[s]["vals"]})
    tv = {}
    for k in keys:
        holders = [s for s in slugs if k in parsed[s]["vals"]]
        vs = {parsed[s]["vals"][k] for s in holders}
        if len(holders) >= 2 and len(vs) == 1:
            tv[k] = parsed[holders[0]]["vals"][k]
    tenant_vals[t] = tv
    for s in slugs:
        file_vals[s] = {k: v for k, v in parsed[s]["vals"].items() if k not in tv}

# --- escritura ---
if VAULT.exists():
    shutil.move(str(VAULT), str(HOME / (".secrets.pre-" + __import__("time").strftime("%Y%m%d-%H%M%S"))))
for sub in ("tenants", "files", "templates"):
    (VAULT / sub).mkdir(parents=True, exist_ok=True)
os.chmod(VAULT, 0o700)

def wr(path, body):
    path.write_text(body)
    os.chmod(path, 0o600)

for t, tv in tenant_vals.items():
    body = [f"# inquilino: {t} — valores compartidos por 2+ archivos, valor identico",
            "# editar aqui y correr:  secret sync --all", ""]
    body += [f"{k}={v}" for k, v in sorted(tv.items())]
    wr(VAULT / "tenants" / f"{t}.env", "\n".join(body) + "\n")

for s, fv in file_vals.items():
    body = [f"# archivo: {parsed[s]['rel']}  (inquilino {parsed[s]['tenant']})",
            "# valores propios de este archivo: exclusivos o divergentes del inquilino", ""]
    body += [f"{k}={v}" for k, v in sorted(fv.items())]
    wr(VAULT / "files" / f"{s}.env", "\n".join(body) + "\n")
    wr(VAULT / "templates" / f"{s}.tmpl", parsed[s]["tmpl"])

man = ["# slug\tinquilino\truta_destino"]
man += [f"{s}\t{parsed[s]['tenant']}\t{parsed[s]['rel']}" for s in parsed]
wr(VAULT / "manifest.tsv", "\n".join(man) + "\n")

json.dump({s: dict(tenant=parsed[s]["tenant"], rel=parsed[s]["rel"],
                   n_tenant=len([k for k in parsed[s]["vals"] if k in tenant_vals[parsed[s]["tenant"]]]),
                   n_own=len(file_vals[s])) for s in parsed},
          open(sys.argv[1], "w"), indent=1)

print("vault en", VAULT)
for t in tenants:
    print(f"  tenants/{t}.env  {len(tenant_vals[t])} variables compartidas")
print()
for s in parsed:
    tn = len([k for k in parsed[s]["vals"] if k in tenant_vals[parsed[s]["tenant"]]])
    print(f"  {s:<15} {tn:>2} del inquilino + {len(file_vals[s]):>2} propias = {len(parsed[s]['vals']):>2}")
if problems:
    print("\nAVISOS:")
    for p in problems: print("  !", p)
