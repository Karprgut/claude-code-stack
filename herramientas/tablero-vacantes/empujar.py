#!/usr/bin/env python3
"""Lee Gmail aquí en la Mac y empuja SOLO el resumen al tablero de Vercel.

Lo que sale de esta máquina: remitente, asunto, fecha, extracto y la liga a
Gmail. Lo que nunca sale: el client_secret y los refresh tokens de Google, que
se quedan en ~/.config/google-workspace-mcp/credentials/.

Config en ~/.config/tablero-vacantes/env (TABLERO_URL, TABLERO_PUSH_SECRET).
Uso:  python3 empujar.py          empuja
      python3 empujar.py --seco   solo imprime lo que mandaría
"""

import json
import os
import sys
import urllib.error
import urllib.request

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)

import servidor  # noqa: E402  (reutiliza su lectura de Gmail)

CONFIG = os.path.expanduser("~/.config/tablero-vacantes/env")


def lee_config():
    if not os.path.exists(CONFIG):
        sys.exit("falta " + CONFIG)
    datos = {}
    with open(CONFIG, encoding="utf-8") as fh:
        for linea in fh:
            linea = linea.strip()
            if not linea or linea.startswith("#") or "=" not in linea:
                continue
            k, v = linea.split("=", 1)
            datos[k.strip()] = v.strip()
    for campo in ("TABLERO_URL", "TABLERO_PUSH_SECRET"):
        if not datos.get(campo):
            sys.exit("a %s le falta %s" % (CONFIG, campo))
    return datos


def main():
    seco = "--seco" in sys.argv
    cfg = lee_config()

    vacantes = servidor.lee_estado()
    datos = servidor.junta_correo(vacantes, forzar=True)

    carga = {
        "mensajes": datos["mensajes"],
        "cuentas": datos["cuentas"],
        "problemas": datos["problemas"],
        "cuando": datos["cuando"],
    }

    print("%d mensajes · cuentas: %s" % (len(carga["mensajes"]), ", ".join(carga["cuentas"]) or "ninguna"))
    for p in carga["problemas"]:
        print("  OJO %s: %s" % (p["cuenta"], p["error"]))

    if seco:
        print("(--seco: no se empujó nada)")
        return

    cuerpo = json.dumps(carga, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        cfg["TABLERO_URL"].rstrip("/") + "/api/correo",
        data=cuerpo,
        headers={
            "Content-Type": "application/json",
            "x-push-secret": cfg["TABLERO_PUSH_SECRET"],
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            print("empujado:", json.load(r))
    except urllib.error.HTTPError as e:
        sys.exit("el tablero contestó %s: %s" % (e.code, e.read().decode("utf8", "ignore")[:200]))
    except Exception as e:  # noqa: BLE001
        sys.exit("no se pudo empujar: %s" % e)


if __name__ == "__main__":
    main()
