#!/bin/sh
# Arranca el MCP de Google Workspace (Gmail, Drive, Calendar, Docs, Sheets,
# Slides, Tasks) en modo stdio, con VARIAS cuentas a la vez.
#
# A diferencia del MCP de Analytics, aquí NO hay un servidor por cuenta: un solo
# servidor lee todas las credenciales de $DIR/credentials y cada herramienta
# recibe la cuenta en el parámetro user_google_email. Las credenciales las
# genera authorize.py (una por correo).
#
# Cuenta por defecto (cuando no se especifica): $DIR/default-email
# Cliente OAuth: el mismo de Google Ads/Analytics, leído del .env del repo.
set -eu
DIR="$HOME/.config/google-workspace-mcp"
ENVFILE="${GOOGLE_WORKSPACE_ENV_FILE:-$HOME/Trabajo/Karma Creative Lab/google-ads-karma/.env}"
[ -r "$ENVFILE" ] || { echo "run.sh: no puedo leer $ENVFILE" >&2; exit 2; }

get() { grep -m1 "^$1=" "$ENVFILE" 2>/dev/null | sed -E "s/^$1=//; s/^[\"']//; s/[\"']\$//"; }
get2() { v=$(get "GOOGLE_WORKSPACE_$1"); [ -n "$v" ] || v=$(get "GOOGLE_ADS_$1"); printf '%s' "$v"; }

GOOGLE_OAUTH_CLIENT_ID=$(get2 CLIENT_ID)
GOOGLE_OAUTH_CLIENT_SECRET=$(get2 CLIENT_SECRET)
[ -n "$GOOGLE_OAUTH_CLIENT_ID" ] && [ -n "$GOOGLE_OAUTH_CLIENT_SECRET" ] || {
  echo "run.sh: falta CLIENT_ID/CLIENT_SECRET en $ENVFILE" >&2; exit 2; }
export GOOGLE_OAUTH_CLIENT_ID GOOGLE_OAUTH_CLIENT_SECRET

WORKSPACE_MCP_CREDENTIALS_DIR="$DIR/credentials"; export WORKSPACE_MCP_CREDENTIALS_DIR
if [ -r "$DIR/default-email" ]; then
  USER_GOOGLE_EMAIL=$(tr -d '[:space:]' < "$DIR/default-email"); export USER_GOOGLE_EMAIL
fi

# Tier de herramientas: extended (60 tools) trae lo esencial + adjuntos de
# Gmail, etiquetas, borradores e hilos. core = 27, complete = todo.
# Se puede cambiar sin editar esto: WORKSPACE_TOOL_TIER=core
TIER="${WORKSPACE_TOOL_TIER:-extended}"
exec "$HOME/.local/bin/workspace-mcp" \
  --transport stdio \
  --tool-tier "$TIER" \
  --tools gmail drive calendar docs sheets slides tasks \
  ${1+"$@"}
