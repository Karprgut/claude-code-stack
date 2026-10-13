#!/bin/sh
# Arranca el MCP oficial de Google Ads para un PERFIL de cuentas.
#
#   run.sh            → adglow (default, compatible con el registro anterior)
#   run.sh adglow     → perfil 1 (ejemplo): lee el .env.local de un proyecto
#   run.sh adglow-mcc → perfil 2 (ejemplo): otro .env del mismo proyecto
#   run.sh kcl        → perfil 3 (ejemplo): el .env de otro proyecto
#   Renombra los perfiles a tu gusto; cada uno apunta a UN .env.
#                       (las cuentas de la empresa)
#
# Fuente única de verdad: los .env de cada proyecto. No se copian secretos a la
# config de Claude ni a ningún repo. Al renovar el refresh token en su .env,
# este launcher lo recoge solo en el siguiente arranque.
#
# Overrides opcionales (env): GOOGLE_ADS_ENV_FILE, GOOGLE_ADS_MCP_LOGIN.
set -eu
PROFILE="${1:-adglow}"
[ $# -gt 0 ] && shift   # el resto de args va al binario, no al launcher
DIR="$HOME/.config/google-ads-mcp"

case "$PROFILE" in
  adglow) DEFAULT_ENV="$HOME/Trabajo/adglow/adglow/.env.local";      LOGIN_KEY="GOOGLE_ADS_ACCOUNT" ;;
  kcl)    DEFAULT_ENV="$HOME/Trabajo/Karma Creative Lab/google-ads-karma/.env";  LOGIN_KEY="GOOGLE_ADS_LOGIN_CUSTOMER_ID" ;;
  # MCC propio de Adglow (pauta de adglow.mx). El .env lo crea scripts/google-ads-oauth.mjs
  # con un usuario admin de ese MCC; ver docs/infra-medicion-adglow-mx.md.
  adglow-mcc) DEFAULT_ENV="$HOME/Trabajo/adglow/adglow/.env.gads-adglow"; LOGIN_KEY="GOOGLE_ADS_LOGIN_CUSTOMER_ID" ;;
  *) echo "run.sh: perfil desconocido '$PROFILE' (usa: adglow | kcl | adglow-mcc)" >&2; exit 2 ;;
esac
ENVFILE="${GOOGLE_ADS_ENV_FILE:-$DEFAULT_ENV}"
[ -r "$ENVFILE" ] || { echo "run.sh: no puedo leer $ENVFILE" >&2; exit 2; }

get() { grep -m1 "^$1=" "$ENVFILE" | sed -E "s/^$1=//; s/^[\"']//; s/[\"']\$//"; }

umask 077
mkdir -p "$DIR"
# ADC por perfil: si todos escribieran al mismo archivo se pisarían entre arranques.
ADC="$DIR/adc-$PROFILE.json"
printf '{\n  "type": "authorized_user",\n  "client_id": "%s",\n  "client_secret": "%s",\n  "refresh_token": "%s"\n}\n' \
  "$(get GOOGLE_ADS_CLIENT_ID)" "$(get GOOGLE_ADS_CLIENT_SECRET)" "$(get GOOGLE_ADS_REFRESH_TOKEN)" > "$ADC"

GOOGLE_APPLICATION_CREDENTIALS="$ADC"; export GOOGLE_APPLICATION_CREDENTIALS
GOOGLE_ADS_DEVELOPER_TOKEN=$(get GOOGLE_ADS_DEVELOPER_TOKEN); export GOOGLE_ADS_DEVELOPER_TOKEN
GOOGLE_ADS_LOGIN_CUSTOMER_ID="${GOOGLE_ADS_MCP_LOGIN:-$(get "$LOGIN_KEY")}"; export GOOGLE_ADS_LOGIN_CUSTOMER_ID

exec "$HOME/.local/bin/google-ads-mcp" ${1+"$@"}
