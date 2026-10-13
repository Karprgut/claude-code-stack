# Editor de texto para PDF — Karma Creative Lab

Sitio estático que abre uno o varios PDF, los unifica en un solo documento,
detecta sus líneas de texto y permite editarlas directamente encima de la página.
Todo ocurre en el navegador: los archivos nunca se suben a un servidor.

Sistema visual: `Karma Creative Lab Design System` (tokens copiados en
`brand/kcl-tokens.css`, logo en `brand/`). Brutalista: bordes de 4px, sombras
duras sin blur, Space Grotesk / Inter / Courier Prime, verde `#00FF41` y rojo
`#FF0033`, copy en español y en mayúsculas para títulos y botones.

## Cómo funciona

0. **Lote.** Se pueden soltar varios PDF a la vez. Con más de uno, `pdf-lib`
   copia las páginas de cada archivo en un documento nuevo, en el orden de la
   lista lateral (reordenable). Con un solo archivo se respeta el original tal
   cual, sin recomprimir. Cambiar el orden o quitar un documento rehace el
   archivo unificado y por eso pide confirmación si hay cambios sin descargar.
1. **pdf.js** renderiza cada página en un canvas y extrae los fragmentos de texto
   con su posición, tamaño y fuente real. Los fragmentos se agrupan en líneas
   editables (`contenteditable`) colocadas encima del canvas.
2. El color del texto y del fondo se deducen muestreando los pixeles del canvas.
3. Al exportar, `strip.js` recorre el *content stream* del PDF (y los Form
   XObjects) interpretando los operadores de texto, y **elimina** los que caen
   dentro de las líneas editadas — el texto viejo no queda oculto, desaparece.
   Si alguna línea no se puede limpiar, se cubre con un rectángulo del color de
   fondo detectado y el sitio lo avisa.
4. **pdf-lib** escribe el texto nuevo en la misma línea base, con la fuente
   estándar equivalente (Helvetica / Times / Courier, con variantes bold e
   itálica) y respetando la rotación de la página.

## Límites conocidos

- Requiere PDFs con texto real; los escaneados (imagen) solo admiten texto nuevo.
- El texto se re-escribe con las fuentes base del PDF, no con la fuente original
  incrustada: en tipografías muy particulares el renglón cambia de aspecto.
- Caracteres fuera de WinAnsi (cp1252) se guardan como `?`.
- PDFs con contraseña: el texto original se cubre, pero no se puede borrar.

## Desarrollo

No hay build. Basta servir la carpeta:

```bash
python3 -m http.server 8765
```

Deploy: `npx vercel --prod`
