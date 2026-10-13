#!/bin/bash
# Rutina diaria del radar de demanda de KCL.
#   1. radar.py barre LinkedIn por la API de Exa y guarda el corte en salidas/.
#   2. build.py arma el HTML con el acumulado de 30 días.
#   3. claude -p republica ese HTML sobre el artifact de siempre (misma URL).
#
# Los datos se traen por API con credencial, nunca por MCP: una rutina
# desatendida que llama un conector MCP se cuelga en silencio.
#
# Uso: ./run.sh [--solo-build]   ·   logs en ~/Hub/tools/kcl-radar/logs/

set -uo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGS="$DIR/logs"; mkdir -p "$LOGS"
LOG="$LOGS/$(date +%Y-%m-%d).log"
exec >> "$LOG" 2>&1

echo "──────── $(date '+%Y-%m-%d %H:%M:%S') ────────"

ARTIFACT_URL="${ARTIFACT_URL:-https://claude.ai/artifact/<ID>}"   # exporta ARTIFACT_URL o pégalo aquí
HTML="$DIR/out/radar-kcl.html"
ESTADO="$DIR/out/.ultima-version"

# Ventana de 8 días: un día de traslape para que un fin de semana no abra hueco.
# vistos.json evita que el traslape repita prospectos.
if ! /usr/bin/python3 "$DIR/radar.py" --dias 8; then
  echo "FALLO: radar.py no terminó. El artifact queda con la versión de ayer."
  exit 1
fi

if ! /usr/bin/python3 "$DIR/build.py" --out "$HTML"; then
  echo "FALLO: build.py no terminó."
  exit 1
fi

[[ "${1:-}" == "--solo-build" ]] && { echo "solo-build: listo, no se publicó."; exit 0; }

# La herramienta Artifact SOLO se expone cuando el entrypoint es un anfitrión que
# sabe mostrar artifacts. Bajo launchd el entrypoint es "cli" y la herramienta no
# existe, y el log diría "OK" sin haber publicado nada.
export CLAUDE_CODE_ENTRYPOINT=claude-vscode

PREVIA="$(cat "$ESTADO" 2>/dev/null || true)"
ESQUEMA='{"type":"object","properties":{"publicado":{"type":"boolean"},"version":{"type":"string"},"detalle":{"type":"string"}},"required":["publicado","version","detalle"],"additionalProperties":false}'

# El publish exige que la conversación haya leído el artifact primero.
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

printf '%s' "$RESP" > "$DIR/out/.ultima-respuesta.json"

# claude -p sale 0 aunque el agente no publique nada: la única prueba aceptable
# es la salida estructurada. Ojo con jq: "a // b" devuelve b cuando a es false,
# así que las comparaciones van explícitas.
campo(){ printf '%s' "$RESP" | jq -r "$1" 2>/dev/null; }
ERROR="$(campo 'if .is_error == false then "false" else "true" end')"
PUBLICADO="$(campo 'if .structured_output.publicado == true then "true" else "false" end')"
DETALLE="$(campo '.structured_output.detalle // "sin respuesta estructurada"')"
DENEGADOS="$(campo '(.permission_denials // []) | length')"
VERSION="$(campo '.structured_output.version | tostring' | tr -cd '0-9')"
PREVIA_N="$(printf '%s' "$PREVIA" | tr -cd '0-9')"; : "${PREVIA_N:=0}"

# La versión del artifact solo avanza: exigirla mayor a la del corte anterior
# descarta tanto un "ya estaba publicado" como una versión inventada.
if [[ "$ERROR" == "false" && "$PUBLICADO" == "true" && -n "$VERSION" \
      && "$VERSION" -gt "$PREVIA_N" && "$DENEGADOS" == "0" ]]; then
  printf '%s' "$VERSION" > "$ESTADO"
  echo "OK: artifact actualizado · versión $VERSION"
else
  echo "FALLO: el HTML se generó en $HTML pero NO se publicó."
  echo "  is_error=$ERROR publicado=$PUBLICADO version='$VERSION' previa='$PREVIA_N' denegados=$DENEGADOS"
  echo "  detalle: $DETALLE"
  /usr/bin/osascript -e 'display notification "El corte se generó pero no se publicó." with title "KCL radar: publish falló"' 2>/dev/null || true
  exit 1
fi

find "$LOGS" -name '*.log' -mtime +30 -delete
