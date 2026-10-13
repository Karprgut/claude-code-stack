# Generador de los case studies

Los nueve artículos de la tanda 30-sep-2026 **no se escribieron a mano en HTML**: se generan
desde aquí. Si hay que corregir una frase, cambiar una captura o mover una sección, se edita
el archivo `csN_*.py` y se vuelve a correr — así preview y artículo de Shopify nunca se
desincronizan.

## Cómo regenerar uno

```
cd "social-content/_builder"
python3 cs4_fabiola.py        # reescribe preview.html y shopify-article.html de ese caso
```

> Si ya inyectaste la base del CDN con `sed`, **regenerar pisa ese cambio** y vuelve a dejar
> `__CDNBASE__`. Vuelve a correr el `sed` de las INSTRUCCIONES después.

## Qué hay aquí

| Archivo | Para qué |
|---|---|
| `css.py` | El sistema visual compartido. Una función que devuelve el CSS namespeado con el acento que le pases. Tocar aquí cambia los nueve casos. |
| `build.py` | El motor. Toma una configuración de secciones y escupe los dos HTML. |
| `csN_*.py` | El contenido de cada caso: copy, orden de secciones, qué captura va dónde. **Aquí se edita el texto.** |
| `svg_rcn.py` · `svg_pan.py` · `svg_flint.py` · `svg_prisma.py` | Los esquemas, dibujados como SVG en línea. |
| `instrucciones.py` | Regenera los `INSTRUCCIONES.md` de los nueve paquetes de un jalón. |
| `img.sh` | Convierte un PNG a la versión web: 1280 px de ancho, recorte de alto y JPG. |

## Tipos de sección disponibles

`hero` · `sec` (con `num`, `h2`, `lead`, `ps`, `children`, `narrow`) · `shot` · `shots2` ·
`pills` · `cards` · `callout` · `note` · `table` · `diagram` · `divider` · `closing`

Ver `build.py` para los campos exactos de cada uno.

## Agregar un caso nuevo

1. Copia el `csN_*.py` más parecido.
2. Cambia `ns` por un namespace corto y único (evita colisiones con el tema de Shopify).
3. Elige `accent` y `accent2` — normalmente los colores de la marca del proyecto.
4. Procesa las capturas con `img.sh <origen.png> <carpeta-destino> <nombre> [alto-máximo]`.
5. Corre el script y agrega la fila a `../BLOGS-PORTAFOLIO-2026.md`.
