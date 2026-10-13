#!/bin/sh
# Levanta el tablero de vacantes y lo abre en el navegador.
set -eu
DIR=$(cd "$(dirname "$0")" && pwd)
PUERTO="${PUERTO:-8787}"
export PUERTO
( sleep 1; open "http://127.0.0.1:$PUERTO" ) &
exec python3 "$DIR/servidor.py"
