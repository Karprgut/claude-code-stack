---
name: adglow-video
description: Convierte una presentación/deck (PPTX, PDF o contenido) en un VIDEO con voz en off y animaciones, para el ecosistema Adglow (agencia de paid media; partnership Adglow×Fantástica) y sus marcas (Adglow, Havas, Fantástica, Kapital). Úsalo cuando pidan "haz un video de esta presentación / este PPTX", "convierte el deck en video/reel", "un video estilo el del reporte", "ponle voz en off / narración a este deck", "anima los slides", o cuando haya que producir un MP4 a partir de un deck. Cubre DOS modos: (A) rápido — rasteriza los slides y les pone Ken Burns + crossfade + voz; (B) premium "intelligence layer" — reconstruye el deck como HTML animado (titulares con efecto ScrambleText que se "desencriptan", números con count-up, fade-up) en el sistema visual de la marca, lo renderiza cuadro por cuadro (puppeteer + Chrome) y lo ensambla con ffmpeg. La voz en off sale de macOS `say` (gratis, local) o de ElevenLabs/OpenAI (natural, requiere API key). NO es para armar el deck en sí (usa `adglow-slides`) ni para el look de marca a detalle (usa `adglow-brand-design`).
---

# Adglow Video

Skill para convertir **decks/presentaciones en video** al nivel de acabado que Kar estableció. Producto final: un **MP4 1920×1080** con **voz en off en español** sincronizada y animaciones on-brand. Nació del video "Vertical QSR × HAVAS" y del demo "HAVAS · Intelligence Layer".

> **adglow-video** = deck → video. Para *armar* el deck usa `adglow-slides`; para el sistema visual completo de cada marca, `adglow-brand-design`. Los scripts reutilizables viven en `scripts/` de esta skill.

## Los dos modos (elige según lo que pidan)

| | **MODO A — Ken Burns** | **MODO B — Intelligence Layer** |
|---|---|---|
| Qué es | Slides rasterizados con zoom sutil + crossfade | Deck **reconstruido como HTML animado**, reveals de letras/números |
| Movimiento | Zoom lento (Ken Burns) sobre la imagen | ScrambleText (decode) en titulares, **count-up** en KPIs, fade-up |
| Fidelidad | Idéntico al PPTX (fotos, logos, layout) | Reinterpretación en el lenguaje del reporte (data-forward, sin fotos) |
| Esfuerzo | Bajo (minutos) | Alto (se reescribe el contenido a escenas + render cuadro a cuadro) |
| Cuándo | "haz un video del deck tal cual" | "como el del reporte", "que las letras/números aparezcan/se animen" |
| Script | `scripts/kenburns.py` | `scripts/build_reel.example.py` + `scripts/render_frames.js` |

Regla: si piden **animar el texto** ("que aparezcan las letras", "los números que cuenten", "estilo intelligence layer / el del reporte") → **MODO B**. Un PNG plano no tiene letras separables; hay que reconstruir en HTML. Si solo quieren "el deck como video" → **MODO A**.

## Voz en off (obligatorio decidir antes de renderizar)

El timing de las escenas = **duración de la voz + padding**, así que **fija la voz ANTES** de renderizar cuadros (en MODO B re-renderizar 3,000 frames dos veces es caro).

1. **Escribe el guion**: una línea por escena/slide, español mexicano (tú), voz Havas/Adglow — datos antes que adjetivos, frases cortas (~12–16 palabras ≈ 4–6 s). Guárdalo como `lines.json` (array de strings).
2. **Elige el motor:**
   - **macOS `say`** (gratis, local, sintético) → `scripts/vo_say.py`. Voces es-MX: **Eddy, Flo, Reed, Rocko, Sandy, Shelley** (modernas) · **Paulina** (clásica clara) · Mónica (es-ES). Lista: `say -v '?' | grep es_`.
   - **ElevenLabs** (natural, la mejor) → `scripts/vo_elevenlabs.py`, `export ELEVENLABS_API_KEY=...` + `--voice-id`. Modelo `eleven_multilingual_v2` para español.
   - **OpenAI TTS** (natural) → ver comentario en `vo_elevenlabs.py` (endpoint `/v1/audio/speech`, voces onyx/alloy).
3. **Deja al usuario elegir voz**: genera 4–5 muestras cortas con la misma frase y **cópialas a `~/Downloads`** (`voz-muestra-<voz>.m4a`) para que las escuche. Pregunta cuál antes de seguir. Las voces de macOS suenan sintéticas; si el usuario quiere calidad, empuja ElevenLabs.

Ambos scripts emiten `vo/voNN.wav` (48k estéreo) + `plan.json` = `[{i, vo, D}]` (D = duración de escena). Ese `plan.json` es la **fuente de verdad del timing** para todo lo demás.

## MODO A — Ken Burns (rápido)

```bash
W=/ruta/work; mkdir -p "$W/frames_hi"
soffice --headless --convert-to pdf --outdir "$W" "deck.pptx"
pdftoppm -r 192 -png "$W/deck.pdf" "$W/frames_hi/h"     # 3840x2160, evita shimmer del texto
python3 scripts/vo_say.py lines.json "$W" --voice "Eddy (Español (México))"
python3 scripts/kenburns.py "$W/frames_hi" "$W" "Salida.mp4"
```
`kenburns.py` hace: segmento zoompan por slide (zoom in/out alternado, supersampling 2x) → cadena `xfade` (crossfade) → coloca cada VO en el arranque de su slide → mux. Total ≈ Σ D − (n−1)·xfade.

## MODO B — Intelligence Layer (premium, "como el del reporte")

El motor es un **HTML determinista**: expone `window.seek(t)` que pinta el DOM en su estado exacto al tiempo `t` **sin CSS transitions ni timers** (todo es función pura de `t`). Así se captura cuadro por cuadro sin desync.

1. **Guion + voz** → `plan.json` (arriba). El HTML lee las duraciones de ahí.
2. **Construye el reel** partiendo de `scripts/build_reel.example.py` (es el builder real del video QSR). Define `S = [...]` (una escena por línea del guion) con layouts: `intro · title · list · case · stats · statement · close`. Emite `reel.html` con:
   - Tokens **Havas Intelligence Layer** (de `adglow/havas-reports/DESIGN-HAVAS.md`): fondo `#0a0a0a`, rojo señal `#e60023`, **Bricolage Grotesque** (display, UPPER, tracking −0.03em), **JetBrains Mono** (números/eyebrows/HUD, tabular slashed-zero), **General Sans** (cuerpo), **Archivo Black** (wordmark HAVAS rojo). Grid 80px @0.045, scanline roja, viñeta, HUD arriba/abajo (`SCENE 0X / 16`, punto rojo).
   - Primitivas de animación deterministas: **scramble** (decode: cada char resuelve escalonado L→R, glyphs pseudoaleatorios función de `(i, floor(lt*22))`), **count-up** (0→target con easeOutCubic, formato con prefijo/sufijo/decimales), **fade-up** (opacity + translateY). Fade de escena in `[0,0.4]` / out `[D−0.35, D]`.
   - Para **otra marca** (Adglow/Fantástica/Kapital): cambia solo los tokens de color/tipografía en el `<style>`; el motor `seek(t)` no cambia.
3. **Renderiza cuadro por cuadro**:
   ```bash
   node scripts/render_frames.js "$W/reel.html" "$W/frames_reel" 30
   ```
   (resuelve puppeteer-core de node_modules o del caché `~/.npm/_npx/*`; Chrome del sistema. ~3,000 frames para ~100s → varios minutos; **córrelo en background**.)
4. **Ensambla** con la voz:
   ```bash
   python3 scripts/assemble.py "$W" "$W/frames_reel" "Salida.mp4" --fps 30
   ```

## Sincronía de audio

Escena `i` empieza en `start_i = Σ D[:i]`. La VO de la escena se coloca en `start_i + lead` (lead ≈ 0.45 s, después del fade-in). Se mezclan con `adelay`+`amix` (no se traslapan → sumar es limpio), se recorta al total del video y se normaliza con `dynaudnorm`. Esto ya está en `assemble.py` (MODO B) y dentro de `kenburns.py` (MODO A).

## Música (opcional)

Por defecto la voz va sola. Para cama musical: mete un `-i music.mp3`, bájala (`volume=0.12`), fade in/out y `amix` con la voz **antes** del `atrim`. Pide el track al usuario o usa uno con licencia; no inventes assets de audio.

## Checklist de verificación (siempre)

- `ffprobe` del MP4: hay stream `video` **y** `audio`; duración = Σ D.
- Extrae frames en momentos de reveal (`ffmpeg -ss <t> -frames:v 1`) y **míralos**: confirma que el scramble sale a media resolución y el count-up a medio conteo (si sale ya resuelto, el `seek(t)` no es determinista).
- Fuentes cargadas (sin fallback): revisa un frame de titular; si Bricolage/Archivo no cargó, se ve una grotesca genérica → espera `document.fonts.ready` en el render.
- Entrega la **ruta absoluta**. Nombre: `{Tema}_x_{Marca}.mp4`.

## Qué NO hacer

- **No renderizar frames antes de fijar la voz** — el timing depende de la VO.
- **No usar CSS transitions/animations ni `setInterval`** en el reel de MODO B — rompe la captura determinista. Todo estado = función de `t` vía `seek(t)`.
- **No mezclar marcas** en un video. Una marca = una paleta = una tipografía.
- **No presentar datos de muestra como reales**: si el deck origen trae placeholders ("CLIENTE", cifras demo), decláralo o pídelos.
- **No inventar la voz "del otro video"**: si no está el asset/engine, pregunta u ofrece ElevenLabs.
- **No borrar** el PPTX/deck origen; el video es un derivado.

## Memoria del proyecto

Adglow vive en `~/adglow`. El sistema visual del reporte está en `adglow/havas-reports/DESIGN-HAVAS.md` + `app/globals.css` + `components/ScrambleText.tsx`. Decks pesados/derivados van a la rama huérfana `propuestas/` (regla <25 MB). Skills hermanas: `adglow-slides` (armar el deck), `adglow-brand-design` (tokens por marca), `adglow-reporte-mensual` (cierre de mes). Herramientas locales: LibreOffice (`soffice`), `ffmpeg`, `pdftoppm`, Node 22 + puppeteer-core (caché npx), Chrome del sistema.
