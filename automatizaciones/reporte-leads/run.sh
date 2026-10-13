#!/bin/bash
# Rutina diaria de leads de TBP.
#   1. build.py trae Brevo + Meta por API y arma el HTML del mes en curso.
#   2. claude -p republica ese HTML sobre el artifact de siempre (misma URL).
#
# Los datos se traen por API con credencial, nunca por MCP: una rutina
# desatendida que llama un conector MCP se cuelga en silencio.
#
# Uso: ./run.sh [--solo-build]   ·   logs en ~/Hub/tools/tbp-leads/logs/

set -uo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGS="$DIR/logs"
mkdir -p "$LOGS"
LOG="$LOGS/$(date +%Y-%m-%d).log"
exec >> "$LOG" 2>&1

echo "──────── $(date '+%Y-%m-%d %H:%M:%S') ────────"

source "$HOME/.config/tbp-leads/env"
HTML="$DIR/out/leads-tbp.html"
ESTADO="$DIR/out/.ultima-version"

if ! python3 "$DIR/build.py" --out "$HTML"; then
  echo "FALLO: build.py no terminó. El artifact queda con la versión de ayer."
  exit 1
fi

# Conversiones de Search al CRM → Google Ads (gclid/gbraid). Best-effort: si falla
# (p. ej. el token sin el scope de Data Manager), el reporte se publica igual.
python3 "$DIR/subir_conversiones_google.py" || echo "AVISO: no se subieron conversiones a Google Ads (ver arriba)."

[[ "${1:-}" == "--solo-build" ]] && { echo "solo-build: listo, no se publicó."; exit 0; }

# La herramienta Artifact SOLO se expone cuando el entrypoint es un anfitrión que
# sabe mostrar artifacts. Bajo launchd el entrypoint es "cli" y la herramienta no
# existe: así se perdieron los cortes del 22 al 28-sep-2026 mientras el log decía
# "OK". Esto también hace que ./run.sh a mano funcione desde cualquier terminal.
export CLAUDE_CODE_ENTRYPOINT=claude-vscode

PREVIA="$(cat "$ESTADO" 2>/dev/null || true)"

ESQUEMA='{"type":"object","properties":{"publicado":{"type":"boolean"},"version":{"type":"string"},"detalle":{"type":"string"}},"required":["publicado","version","detalle"],"additionalProperties":false}'

# El publish exige que la conversación haya leído el artifact primero, así que
# el prompt pide leer y luego republicar; -p corre sin sesión interactiva.
RESP="$(claude -p "Lee el artifact $ARTIFACT_URL con la herramienta Artifact (action read) y
después republica en ESA MISMA url el archivo local $HTML, tal cual, sin editarlo
(action publish, url=$ARTIFACT_URL, file_path=$HTML, label='corte $(date +%d-%b)').
No cambies el HTML ni el favicon. Pon publicado=true y la versión que devolvió el
publish SOLO si el publish realmente ocurrió; si algo falló, publicado=false y el
motivo en detalle." \
  --allowedTools "Artifact" \
  --permission-mode acceptEdits \
  --output-format json \
  --json-schema "$ESQUEMA" </dev/null)" || true

# La respuesta completa se guarda para poder diagnosticar un fallo sin repetir la
# corrida (cada una cuesta dinero y tarda varios minutos).
printf '%s' "$RESP" > "$DIR/out/.ultima-respuesta.json"

# claude -p sale 0 aunque el agente no publique nada: por eso la bitácora mintió
# una semana. La única prueba aceptable es la salida estructurada.
# Ojo con jq: "a // b" devuelve b cuando a es false O null, así que
# '.is_error // true' daba true incluso con is_error=false y el chequeo no podía
# pasar nunca. Las comparaciones van explícitas.
campo(){ printf '%s' "$RESP" | jq -r "$1" 2>/dev/null; }
ERROR="$(campo 'if .is_error == false then "false" else "true" end')"
PUBLICADO="$(campo 'if .structured_output.publicado == true then "true" else "false" end')"
DETALLE="$(campo '.structured_output.detalle // "sin respuesta estructurada"')"
DENEGADOS="$(campo '(.permission_denials // []) | length')"
# El agente redacta la versión como "Version 13" o "13" según le da: se compara
# el número, no el texto.
VERSION="$(campo '.structured_output.version | tostring' | tr -cd '0-9')"
PREVIA_N="$(printf '%s' "$PREVIA" | tr -cd '0-9')"
: "${PREVIA_N:=0}"

# La versión del artifact solo avanza, así que exigirla mayor a la del corte
# anterior descarta tanto un "ya estaba publicado" como una versión inventada.
if [[ "$ERROR" == "false" && "$PUBLICADO" == "true" && -n "$VERSION" \
      && "$VERSION" -gt "$PREVIA_N" && "$DENEGADOS" == "0" ]]; then
  printf '%s' "$VERSION" > "$ESTADO"
  echo "OK: artifact actualizado · versión $VERSION"
else
  echo "FALLO: el HTML se generó en $HTML pero NO se publicó."
  echo "  is_error=$ERROR publicado=$PUBLICADO version='$VERSION' previa='$PREVIA_N' denegados=$DENEGADOS"
  echo "  detalle: $DETALLE"
  # Que se note sin tener que abrir el log.
  /usr/bin/osascript -e 'display notification "El corte se generó pero no se publicó." with title "TBP leads: publish falló"' 2>/dev/null || true
  exit 1
fi

# 30 días de bitácora es suficiente para auditar la rutina.
find "$LOGS" -name '*.log' -mtime +30 -delete
