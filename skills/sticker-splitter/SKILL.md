---
name: sticker-splitter
description: Recorta stickers/elementos individuales de hojas o planchas PNG donde vienen todos juntos (sticker sheets, sets de formas, planchas de assets). Detecta el fondo solo (transparente real, o sólido/checkerboard horneado), separa cada pieza conservando transparencia, y deja Posters/ + Elementos/ planos. Úsalo cuando Kar diga "separa los stickers de esta hoja", "recorta cada elemento de esta plancha", "saca los stickers por separado", o tenga PNGs tipo magnific/sticker-sheet con muchos elementos en una sola imagen.
user-invocable: true
---

# Sticker Splitter

Separa una hoja/plancha PNG (muchos stickers juntos) en **un archivo por sticker**, con fondo transparente. Maneja tres tipos de fondo automáticamente y deja una salida en **dos carpetas planas** (sin sub-carpeta por hoja, como le gusta a Kar).

## Salida
```
<out>/Posters/     copia de las hojas procesadas
<out>/Elementos/   stickers sueltos, PLANO, nombrados <idHoja>_NN.png
<out>/_review/     (--review) mosaicos numerados sobre MAGENTA para QA visual
<out>/_con_fondo/  (--transparent-only) hojas no-transparentes movidas aparte
```
El `<idHoja>` es el sufijo corto del nombre del archivo, para rastrear de qué hoja salió cada pieza.

## Setup (una vez)
El motor usa Pillow + numpy + scipy. Crea un venv junto al trabajo:
```bash
python3 -m venv .venv
.venv/bin/pip install -q pillow numpy scipy
```
Luego corre todo con `.venv/bin/python`. El script (`sticker_split.py`) vive en esta carpeta del skill.

## Flujo recomendado
1. **Primera pasada** sobre todas las hojas, con QA:
   ```bash
   .venv/bin/python <skill>/sticker_split.py "*.png" --out Stickers --review
   ```
   Usa `--transparent-only` si en la carpeta hay versiones viejas **con fondo** que NO quieres procesar: las mueve a `_con_fondo/` en vez de recortarlas.
2. **Revisa los mosaicos** de `_review/` (uno por hoja, sobre magenta → cualquier fondo arrastrado salta a la vista). Léelos y clasifica cada hoja:
   - **Clusters fusionados** (una esquina con mini-elementos pegados en 1 blob) → bridge muy alto.
   - **Texto partido por palabra** ("Drink"/"Goblin" en piezas separadas) → bridge muy bajo.
   - **Líneas/rejillas que conectan todo** (wireframe, trazos de circuito) → falta erosión.
3. **Afina hoja por hoja** sin tocar las demás, con `--only <idHoja>` (reproceso idempotente: borra las piezas viejas de esa hoja y regenera + refresca su mosaico):
   ```bash
   # cluster fusionado: bajar bridge
   .venv/bin/python <skill>/sticker_split.py "*.png" --out Stickers --only jS8jrokLD0 --bridge 1 --review
   # texto multi-palabra: subir bridge
   .venv/bin/python <skill>/sticker_split.py "*.png" --out Stickers --only stickers --bridge 7 --review
   # rejilla/wireframe que conecta stickers: subir open (erosiona líneas finas)
   .venv/bin/python <skill>/sticker_split.py "*.png" --out Stickers --only kLdkH0o16B --bridge 1 --open 4 --review
   ```

## Perillas
| Flag | Default | Para qué |
|---|---|---|
| `--bridge N` | 3 | Une piezas de un mismo sticker. **Bajo (0–2)** separa clusters pegados / parte texto espaciado. **Alto (6–10)** junta texto de varias palabras / arriesga fusionar vecinos. |
| `--open N` | 2 | Erosiona motas y líneas finas antes de separar. **Súbelo (3–5)** en hojas con rejillas wireframe o trazos de circuito que conectan stickers. |
| `--thr N` | 50 | Solo modo color: distancia al fondo. **Súbelo (70–90)** si el fondo sólido tiene textura/cuadrícula de bajo contraste que se cuela como primer plano. |
| `--min-frac F` | 0.0006 | Área mínima relativa para guardar una pieza. Súbelo para descartar accesorios mini (corazones, estrellas, motas). |
| `--pad N` | 12 | Margen en px alrededor de cada recorte. |

## Cómo detecta el fondo (modo automático por hoja)
- **Transparente real** (`>5%` de píxeles con alfa≈0) → máscara por canal **alfa**. Es el caso ideal y más limpio.
- **Sólido o checkerboard horneado** (sin alfa) → modela el fondo como **varios tonos** del marco exterior (cubre el patrón de cuadritos gris de "falsa transparencia") y recorta por distancia de color, dejando el resultado transparente.

## Límites honestos (decírselos a Kar)
- **Texto muy espaciado** entre palabras: connected-components no sabe que pertenecen al mismo sticker sin un bridge tan alto que fusione vecinos. Es un trade-off real; se afina por hoja o se retoca a mano.
- **Hojas con rejillas/wireframe decorativos** que cruzan todo (ej. trazos de circuito): pueden dejar 1–2 artefactos de línea aun con `--open` alto. Son intrínsecamente difíciles para recorte automático.
- Una imagen aplanada **no se des-aplana**: si dos stickers se traslapan en el original, salen como una sola pieza. Si existe el `.svg`/`.psd` vectorial, ahí sí se separan por capas (otra técnica).

## Verificación
Siempre genera `_review/` y **lee los mosaicos** antes de declarar terminado — sobre magenta, un fondo arrastrado o un merge se ven al instante. Reporta a Kar cuántas hojas quedaron limpias y cuáles necesitan afinado/retoque manual.

## Deduplicación (opcional)
Las hojas temáticas repiten diseños entre sí (y a veces una hoja completa es copia de otra). Para detectar duplicados **perceptuales** (no byte-a-byte) corre `find_dups.py` desde la carpeta de salida (donde está `Elementos/`):
```bash
.venv/bin/python <skill>/find_dups.py [MAD_TOL]   # default 0.035; menor = más estricto
```
- Compara cada pieza por **RGBA premultiplicado** a 24×24 (color + estructura + silueta alfa) con tolerancia de aspecto. Esto evita el falso positivo clásico de "todo lo blanco-sobre-transparente se parece".
- Imprime los grupos y escribe `_dups_to_remove.txt` (deja 1 representante por grupo, en orden alfabético → conserva la hoja de mejor fuente).
- **Antes de borrar, VERIFICA**: arma un montaje con los miembros de cada grupo (una fila por grupo) y léelo — confirma que no haya falsos positivos (caras con distinta expresión, formas blancas distintas). Recién entonces borra con la lista.
- Borrado: `while IFS= read -r f; do rm -f "$f"; done < _dups_to_remove.txt`
