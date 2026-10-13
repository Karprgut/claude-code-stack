#!/usr/bin/env python3
"""Conecta una tienda de Shopify como servidor MCP local.

    python3 ~/.config/shopify-mcp/add-store.py <perfil>

Pide el dominio y el token de la app privada (el token se escribe a ciegas,
no queda en el historial de la terminal), guarda el env del perfil en permisos
600, prueba el token contra la Admin API y registra el servidor en Claude Code.

Cómo sacar el token, una vez por tienda:
  admin de la tienda → Configuración → Apps y canales de venta →
  Desarrollar apps → Crear una app → Configurar Admin API →
  marca read_products, write_products, read_customers, write_customers,
  read_orders, write_orders → Guardar → Instalar app →
  copia el «Admin API access token» (empieza con shpat_, se muestra una sola vez)
"""
import getpass
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.error
import urllib.request

DIR = os.path.expanduser("~/.config/shopify-mcp")
API = "2026-07"


def write_env(path, domain, token):
    old = os.umask(0o077)
    try:
        tmp = path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as fh:
            fh.write(f"MYSHOPIFY_DOMAIN={domain}\nSHOPIFY_ACCESS_TOKEN={token}\n")
        os.replace(tmp, path)
    finally:
        os.umask(old)


def probe(domain, token):
    q = {"query": "{ shop { name myshopifyDomain plan { displayName } currencyCode } }"}
    req = urllib.request.Request(
        f"https://{domain}/admin/api/{API}/graphql.json",
        data=json.dumps(q).encode(),
        headers={"X-Shopify-Access-Token": token, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            d = json.load(r)
    except urllib.error.HTTPError as e:
        return None, f"HTTP {e.code}: {e.read().decode()[:200]}"
    except Exception as e:
        return None, str(e)
    if d.get("errors"):
        return None, json.dumps(d["errors"])[:200]
    return (d.get("data") or {}).get("shop"), None


def main():
    if len(sys.argv) < 2 or not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,30}", sys.argv[1]):
        sys.exit("uso: add-store.py <perfil>   (minúsculas, números y guiones)")
    profile = sys.argv[1]
    envfile = os.path.join(DIR, f"env.{profile}")
    if os.path.exists(envfile):
        print(f"⚠ El perfil '{profile}' ya existe ({envfile}).")
        if sys.stdin.isatty():
            if input("  ¿Reemplazarlo? escribe SI: ").strip().lower() not in ("si", "sí"):
                sys.exit("cancelado, no toqué nada.")
        else:
            sys.exit("cancelado.")

    print("\nSi aún no tienes el token: admin de la tienda → Configuración → Apps y")
    print("canales de venta → Desarrollar apps → Crear una app → Configurar Admin API →")
    print("scopes read_/write_ de products, customers y orders → Guardar → Instalar app →")
    print("copia el «Admin API access token» (shpat_…, se muestra una sola vez).\n")
    domain = input("Dominio .myshopify.com de la tienda (ej. mi-tienda.myshopify.com): ").strip()
    domain = re.sub(r"^https?://", "", domain).strip("/")
    if not domain.endswith(".myshopify.com"):
        sys.exit("✗ tiene que ser el dominio interno .myshopify.com, no el dominio público")
    token = getpass.getpass("Admin API access token (shpat_…, no se ve al escribir): ").strip()
    if not token.startswith("shpat_"):
        print("⚠ Ese token no empieza con shpat_. Sigo, pero revisa que sea el de la app privada.")

    shop, err = probe(domain, token)
    if err:
        sys.exit(f"✗ El token no funcionó: {err}\n"
                 "  Revisa que la app esté instalada y que tenga los scopes read_/write_ "
                 "de products, customers y orders.")
    write_env(envfile, domain, token)
    print(f"\n✅ Tienda conectada: {shop.get('name')} "
          f"({shop.get('myshopifyDomain')}, {(shop.get('plan') or {}).get('displayName')}, "
          f"{shop.get('currencyCode')})")
    print(f"   credenciales: {envfile}")

    name = f"shopify-{profile}"
    if shutil.which("claude"):
        home = os.path.expanduser("~")
        listing = subprocess.run(["claude", "mcp", "list"], capture_output=True,
                                 text=True, cwd=home).stdout
        if re.search(rf"^{re.escape(name)}:", listing, re.M):
            print(f"✓ {name} ya estaba registrado en Claude Code.")
        else:
            r = subprocess.run(["claude", "mcp", "add", name, "--scope", "user", "--",
                                f"{DIR}/run.sh", profile], capture_output=True,
                               text=True, cwd=home)
            print(f"✓ Registrado en Claude Code como {name}" if r.returncode == 0
                  else "⚠ " + r.stderr.strip())
    print("\n→ Reinicia Claude Code para usarla.")


if __name__ == "__main__":
    main()
