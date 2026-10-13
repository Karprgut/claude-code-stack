#!/bin/bash
# Compila el centinela y arma el app bundle firmado ad hoc.
# Se corre desde ~/.config/centinela/bin (o donde esté centinela.swift).
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
BASE="$(cd .. && pwd)"
APP="$BASE/Centinela.app"

swiftc -O -o centinela centinela.swift \
  -framework AVFoundation -framework Vision -framework CoreImage -framework Foundation

rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS"
cp centinela "$APP/Contents/MacOS/centinela"
cp Info.plist "$APP/Contents/Info.plist"
codesign --force --sign - "$APP"
echo "✓ $APP listo. Siguiente: centinelactl enrolar"
