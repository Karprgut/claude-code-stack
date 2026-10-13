#!/bin/sh
# Arranca el MCP de Shopify para UNA tienda (un perfil = una tienda).
#
#   run.sh <perfil>     lee $DIR/env.<perfil>
#
# El token es de una app privada de la tienda (Admin API access token, shpat_…),
# así que pertenece a la TIENDA y no a la cuenta con la que entraste al admin.
# Se pasa por variable de entorno, nunca como argumento, para que no aparezca en `ps`.
set -eu
DIR="$HOME/.config/shopify-mcp"
PROFILE="${1:-}"
[ -n "$PROFILE" ] || { echo "uso: run.sh <perfil>" >&2; exit 2; }
case "$PROFILE" in *[!a-z0-9-]*) echo "run.sh: perfil inválido '$PROFILE'" >&2; exit 2 ;; esac

ENVFILE="$DIR/env.$PROFILE"
[ -r "$ENVFILE" ] || { echo "run.sh: falta $ENVFILE" >&2
  echo "        créalo con: python3 $DIR/add-store.py $PROFILE" >&2; exit 2; }

get() { grep -m1 "^$1=" "$ENVFILE" 2>/dev/null | sed -E "s/^$1=//; s/^[\"']//; s/[\"']\$//"; }
SHOPIFY_ACCESS_TOKEN=$(get SHOPIFY_ACCESS_TOKEN)
MYSHOPIFY_DOMAIN=$(get MYSHOPIFY_DOMAIN)
[ -n "$SHOPIFY_ACCESS_TOKEN" ] && [ -n "$MYSHOPIFY_DOMAIN" ] || {
  echo "run.sh: faltan SHOPIFY_ACCESS_TOKEN o MYSHOPIFY_DOMAIN en $ENVFILE" >&2; exit 2; }
export SHOPIFY_ACCESS_TOKEN MYSHOPIFY_DOMAIN

exec "$DIR/node_modules/.bin/shopify-mcp"
