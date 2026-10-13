# Checklist de calidad — antes de declarar el deck listo

Recórrela completa antes de entregar. Es el mismo estándar de los tres decks canónicos.

## Contenido y narrativa
- [ ] La **portada** lleva cliente, "Post Mortem", mes/año y versión correctos.
- [ ] El **resumen ejecutivo** es la segunda slide y da el veredicto del mes en un título-conclusión + KPIs hero.
- [ ] Cada slide de contenido tiene un **título-conclusión** (no una etiqueta). El `content-eyebrow` da el tema.
- [ ] El deck **cierra mirando al futuro**: Do's & Don'ts + Next Steps son los dos últimos bloques, nunca una métrica.
- [ ] No hay slides de relleno. Si una sección no tiene dato que la sustente este mes, se quitó.
- [ ] **Un corte se reporta solo si existe en la ejecución.** Si la pauta dejó de abrir por geo (o por cualquier dimensión), ese bloque se retiró y se dijo por qué — no se dejó una tabla con todo en una fila.
- [ ] **Tono de auditoría neutra.** Los hallazgos están enunciados como lecturas y oportunidades de reasignación, no como errores. Sin contrastes retóricos ("no era X, sino Y") ni juicios bueno/malo. Sin frases como "tráfico barato".
- [ ] El texto le habla al **lector genérico**, no a una persona.
- [ ] **Atribución creativa: máximo dos slides por canal** — la tabla de piezas con el gasto abierto por bloque de objetivo, y los testigos. Cada fila dice de qué campaña o bloque viene.

## Datos
- [ ] Toda cifra lleva **unidad** ($, %, k MXN, leads, ROAS, CPA, sesiones).
- [ ] Los **deltas** (vs. mes anterior / vs. Q) están calculados y con dirección correcta (up/down/flat).
- [ ] Las cifras **cuadran**: totales = suma de partes; plan vs. ejecutado = % correcto; splits regionales suman 100%.
- [ ] Las cifras del deck coinciden con los CSV/XLSX crudos en `reportes/`/`data/`. Sin números inventados.
- [ ] **Lo que no se sabe se declaró** (atribución parcial, canal bloqueado por saldo, dato estimado, hueco de tracking).
- [ ] **Barrido de datos viejos.** Al clonar el mes anterior quedan slides heredadas con cifras hardcodeadas de otro mes: `grep -niE "DATOS DE (ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)" build_pptx.py` debe salir vacío, y ningún slide de la secuencia menciona un mes que no sea el del reporte ni el de comparación.
- [ ] **Índices de mes verificados.** Las variables que leen la serie por posición (`RES_MES[n]`, listas de meses) apuntan al mes correcto después de agregar el mes nuevo.
- [ ] **La convención de IVA es explícita y correcta:** el ÷ 1.16 se aplicó **solo a los canales cuya línea trae IVA** (en Kabrita: Google y TikTok; Meta entra sin ajuste), y la línea neta nunca es el gasto copiado para forzar un 100%. Se muestran las dos columnas (media plan y línea neta) más el gasto y el %. Toda métrica de eficiencia se calculó sobre el gasto de plataforma.
- [ ] **Ningún encabezado ni etiqueta generaliza el ajuste.** Nada dice "media plan (con IVA)" ni "neto ÷ 1.16" sobre una tabla donde una fila no se dividió; la fila sin ajuste va marcada y la nota al pie nombra a qué canales aplica el IVA.
- [ ] **Ningún cumplimiento arriba de ~105%.** Si un canal da 112%, se neteó una línea que ya estaba neta.
- [ ] **Las dos cifras de venta no se sumaron.** Shopify es la cifra de negocio; GA4 aporta mezcla de canales. La diferencia está declarada.

## Visual (sistema del cliente)
- [ ] Solo colores y fuentes del cliente (Kabrita navy/analítica · RC B/N/rojo · TBP azul/cream). Cero colores fuera del sistema.
- [ ] Ningún texto **se desborda** de su contenedor (reduce fontSize o agranda la caja).
- [ ] **El builder reporta 0 desbordes y 0 `clamp-top`.** Un `clamp-top` es un bloque más alto que el espacio entre header y footer: se sale por abajo y pisa el pie. Se arregla acortando el título a una línea (lo que más espacio libera) o comprimiendo filas y tarjetas — nunca se deja encimado.
- [ ] **Las tablas suman `tw − 60`.** El ancho de las columnas debe sumar el ancho de la tabla menos el padding de los dos lados; si suma el ancho completo, la última columna se corta.
- [ ] **Los testigos visuales existen y son el arte real.** Nada de avatares de página de 64 px ni placeholders. Meta por `ads_get_ig_media`, TikTok por `tiktok_item_id` + oEmbed.
- [ ] Footer chrome consistente: marca KCL + cliente, page-num zero-padded, en cada slide de contenido.
- [ ] **Ruth's Chris:** acento rojo 6–10px arriba de cada card · esquinas a 0px · UPPERCASE · punto del hero en rojo (`<em>.</em>`) · rojo escaso (≤3 elementos rojos/slide fuera de acentos).
- [ ] **Kabrita:** barras con top-rounded (~22px) · register ejecutivo-analítico · corte regional **de la demanda** presente (el de la pauta solo si la ejecución abre por geo).
- [ ] **TBP:** chrome flat · divisores "Sección 0X" · KPIs de lead-gen (no ROAS).

## Export PPTX
- [ ] El PPTX se regeneró con el **builder correcto** (RC: `node build.js`; Kabrita/TBP: `python3 build_pptx.py`) — y en Kabrita/TBP se editó el **builder**, no solo el HTML.
- [ ] Nombre de archivo de salida actualizado al **mes nuevo**.
- [ ] Charts y tablas son **nativos** (Edit Data funciona), no imágenes.
- [ ] **Font-safety verificado:** `unzip -p deck.pptx ppt/slides/slide*.xml | grep -oE 'typeface="[^"]+"' | sort -u` devuelve solo las fuentes del cliente (o sustitución aceptable acordada con Kar).
- [ ] **Letter-spacing 0** en RC: `grep -c 'spc='` → 0.
- [ ] El PPTX abre sin errores y se ve idéntico al HTML preview.

## Voz
- [ ] Español mexicano, tú forms. Sin voseo argentino ni formas ibéricas.
- [ ] Cada hallazgo y recomendación trae el **porqué**, no solo el dato.
- [ ] Honestidad operativa: si el mes fue flojo, el deck lo dice con datos y propone el fix.
