#!/bin/sh
# Arranca el MCP oficial de Google Analytics (GA4) para un PERFIL de cuentas.
#
#   run.sh            → kcl (default)
#   run.sh kcl        → propiedades GA4 de Karma Creative Lab
#                       (las cuentas de la empresa)
#   run.sh adglow     → propiedades GA4 del stack Adglow
#   run.sh <otro>     → $DIR/env.<otro>, un perfil por cuenta de Google extra
#
# Mismo contrato que ~/.config/google-ads-mcp/run.sh: la fuente única de verdad
# son los .env de cada proyecto. No se copian secretos a la config de Claude ni
# a ningún repo. El refresh token lo genera authorize.py (scope analytics.readonly)
# y este launcher lo recoge solo en el siguiente arranque.
#
# Variables que lee del .env (con fallback al cliente OAuth de Ads, que es el mismo):
#   GOOGLE_ANALYTICS_CLIENT_ID      ← GOOGLE_ADS_CLIENT_ID
#   GOOGLE_ANALYTICS_CLIENT_SECRET  ← GOOGLE_ADS_CLIENT_SECRET
#   GOOGLE_ANALYTICS_REFRESH_TOKEN  (obligatorio, scope analytics.readonly)
#   GOOGLE_ANALYTICS_PROJECT_ID     (opcional, quota project)
#
# Overrides opcionales (env): GOOGLE_ANALYTICS_ENV_FILE.
set -eu
PROFILE="${1:-kcl}"
[ $# -gt 0 ] && shift   # el resto de args va al binario, no al launcher
DIR="$HOME/.config/google-analytics-mcp"

case "$PROFILE" in
  kcl)    DEFAULT_ENV="$HOME/Trabajo/Karma Creative Lab/google-ads-karma/.env" ;;
  adglow) DEFAULT_ENV="$HOME/Trabajo/adglow/adglow/.env.local" ;;
  # Perfiles extra = una cuenta de Google cada uno. Los crea authorize.py en
  # $DIR/env.<perfil> (p.ej. kabrita, tbp, amperson).
  *)
    case "$PROFILE" in
      *[!a-z0-9-]*) echo "run.sh: perfil inválido '$PROFILE'" >&2; exit 2 ;;
    esac
    DEFAULT_ENV="$DIR/env.$PROFILE" ;;
esac
ENVFILE="${GOOGLE_ANALYTICS_ENV_FILE:-$DEFAULT_ENV}"
[ -r "$ENVFILE" ] || { echo "run.sh: no puedo leer $ENVFILE" >&2; exit 2; }

get() { grep -m1 "^$1=" "$ENVFILE" 2>/dev/null | sed -E "s/^$1=//; s/^[\"']//; s/[\"']\$//"; }
# Valor de GOOGLE_ANALYTICS_X, y si viene vacío, de GOOGLE_ADS_X (mismo cliente OAuth).
get2() { v=$(get "GOOGLE_ANALYTICS_$1"); [ -n "$v" ] || v=$(get "GOOGLE_ADS_$1"); printf '%s' "$v"; }

CLIENT_ID=$(get2 CLIENT_ID)
CLIENT_SECRET=$(get2 CLIENT_SECRET)
REFRESH=$(get GOOGLE_ANALYTICS_REFRESH_TOKEN)
QUOTA=$(get GOOGLE_ANALYTICS_PROJECT_ID)

[ -n "$CLIENT_ID" ] && [ -n "$CLIENT_SECRET" ] || {
  echo "run.sh: falta CLIENT_ID/CLIENT_SECRET en $ENVFILE" >&2; exit 2; }
[ -n "$REFRESH" ] || {
  echo "run.sh: falta GOOGLE_ANALYTICS_REFRESH_TOKEN en $ENVFILE." >&2
  echo "        Genéralo con: python3 $DIR/authorize.py $PROFILE" >&2; exit 2; }

umask 077
mkdir -p "$DIR"
# ADC por perfil: si todos escribieran al mismo archivo se pisarían entre arranques.
ADC="$DIR/adc-$PROFILE.json"
if [ -n "$QUOTA" ]; then
  printf '{\n  "type": "authorized_user",\n  "client_id": "%s",\n  "client_secret": "%s",\n  "refresh_token": "%s",\n  "quota_project_id": "%s"\n}\n' \
    "$CLIENT_ID" "$CLIENT_SECRET" "$REFRESH" "$QUOTA" > "$ADC"
  GOOGLE_PROJECT_ID="$QUOTA"; export GOOGLE_PROJECT_ID
  GOOGLE_CLOUD_PROJECT="$QUOTA"; export GOOGLE_CLOUD_PROJECT
else
  printf '{\n  "type": "authorized_user",\n  "client_id": "%s",\n  "client_secret": "%s",\n  "refresh_token": "%s"\n}\n' \
    "$CLIENT_ID" "$CLIENT_SECRET" "$REFRESH" > "$ADC"
fi

GOOGLE_APPLICATION_CREDENTIALS="$ADC"; export GOOGLE_APPLICATION_CREDENTIALS

exec "$HOME/.local/bin/analytics-mcp" ${1+"$@"}
