#!/bin/zsh
# img.sh <src.png> <dest-dir> <nombre-destino-sin-ext> [maxH]
src="$1"; dest="$2"; name="$3"; maxH="${4:-3600}"
mkdir -p "$dest/screenshots" "$dest/screenshots-web"
cp "$src" "$dest/screenshots/$name.png"
tmp=$(mktemp -d)
# 1) escalar a 1280 de ancho
sips --resampleWidth 1280 "$src" --out "$tmp/w.png" >/dev/null 2>&1
h=$(sips -g pixelHeight "$tmp/w.png" | awk '/pixelHeight/{print $2}')
# 2) recortar alto si excede
if [ "$h" -gt "$maxH" ]; then
  sips -c "$maxH" 1280 --cropOffset 0 0 "$tmp/w.png" --out "$tmp/w.png" >/dev/null 2>&1
fi
# 3) a JPG
sips -s format jpeg -s formatOptions 72 "$tmp/w.png" --out "$dest/screenshots-web/$name.jpg" >/dev/null 2>&1
sz=$(du -k "$dest/screenshots-web/$name.jpg" | cut -f1)
dim=$(sips -g pixelWidth -g pixelHeight "$dest/screenshots-web/$name.jpg" | awk '/pixel/{printf "%s ",$2}')
echo "  $name.jpg  ${dim} ${sz}KB"
rm -rf "$tmp"
