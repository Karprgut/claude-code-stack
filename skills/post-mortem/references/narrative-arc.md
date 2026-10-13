# Arco narrativo del post-mortem

El post-mortem cuenta **una historia de cierre de mes**, no una lista de métricas. El orden importa: abrir con el veredicto, sustentarlo con datos, terminar con qué hacer el mes siguiente. Esta es la espina dorsal común, derivada de los tres decks canónicos. Adáptala al tipo de cliente (paid media vs. lead-gen).

## La espina (paid media — Kabrita / Ruth's Chris)

Orden verificado en el cierre de Kabrita · septiembre 2026 (33 slides).

1. **Portada** — cliente, "Post Mortem · Paid Media", mes/año. Sistema visual del cliente a página completa. El título es la lectura del mes, no una etiqueta ("El mes de la estructura nacional").
2. **Resumen ejecutivo** — el veredicto en un título-conclusión + 4 KPIs hero + 3 bullets. La slide que un decisor leería si solo viera una.
3. **Contexto de la comparación** — *va aquí, temprano.* Las 3–5 condiciones que no se repitieron y explican la variación (cambio de línea, de estructura, de calendario promocional, maduración de datos). **Sin esto, los deltas del mes se leen mal.** Antes estaba al final del deck; subirlo fue pedido explícito de Kar.
4. **Presupuesto y gasto por plataforma · serie del año** — tabla mes a mes + mix del gasto.
5. **Resultados mes a mes · serie del año** — impresiones, clics de enlace, sesiones, órdenes, CR. Coloreado contra el mes anterior.
6. **Hallazgos comparativo** — 6 paneles con el delta por canal (tráfico, interacción, cierre, visibilidad, eficiencia, engagement).
7. **Logros del periodo** — 4 lecturas que el mes dejó documentadas.
8. **Plan vs. ejecutado** — media plan → línea neta de IVA → gasto → cumplimiento. Ver § "La convención de IVA".
9. **Plan abierto por línea** — apertura del media plan y objetivos del plan vs. logrado.
10. **Mes vs. mes anterior** — lectura consolidada.
11. *(divisor)* **Resultados por canal**
12. **Distribución de resultados** — el mix de cada métrica entre los canales.
13. **Eficiencia · ROAS / CPA** — ranking de campañas y CPA por canal.
14. **Deep-dive por canal** — Meta → Google → TikTok. KPIs + lectura + distribución del gasto.
15. **Orgánico y canales propios** — GA4: orgánico, email, directo. El ingreso que no costó pauta.
16. **GA4 · sesiones y atribución** — mezcla de canales y la brecha entre atribuciones.
17. **Shopify · ventas por referrer** · **distribución regional** · **blog** — la venta de caja y la demanda.
18. *(divisor)* **Atribución creativa** — **dos slides por canal, no más:**
    - **Las piezas del mes** — una tabla, una fila por pieza, con la inversión abierta **por bloque de objetivo** (consideración / retargeting / promocionado).
    - **Testigos** — una fila de tarjetas con el arte real y su dato.
    Lección de septiembre: las tablas de "top y low performers" por bloque **no se entienden** si no dicen de qué campaña o ad set viene cada fila. Una tabla consolidada por pieza, con las columnas de bloque, comunica lo mismo en un tercio del espacio.
19. **Lecturas a sostener** — 6 lecturas que el periodo dejó documentadas.
20. **Lo que NO sabemos** — los huecos declarados. Nunca se omite.
21. **Do's & Don'ts** — qué sostener y qué ajustar.
22. **Next Steps · <Mes siguiente>** — hoja de ruta con owners y fechas.
23. **Cierre** — espejo de la portada.

### Bloque regional: solo si la pauta se segmenta

Kabrita reportó durante meses el split **CDMX-Edomex vs. Resto** en inversión, impresiones, clics, compras y sesiones. Desde la fusión de geotargeting a nacional (1-sep-2026) **la ejecución ya no abre por geo**, así que esos slides se retiraron: una tabla de "impresiones por región" con 89% en una fila "nacional" no dice nada.

Lo que sí se conserva es el **corte regional de la demanda** (sesiones del sitio por estado, de Shopify), porque mide dónde está el cliente y no cómo se segmentó la pauta. Si el plan vuelve a abrir por geo, el bloque vuelve.

**Regla general:** un corte se reporta mientras exista en la ejecución. Cuando deja de existir, se retira y se dice por qué — no se deja una tabla vacía ni se habla de "audiencia" como si siguiera segmentada.

### La convención de IVA (plan vs. ejecutado)

El reporte de cada plataforma es **neto**. Una línea del media plan que trae IVA no es comparable contra él: hace ver sub-ejecución donde solo hay impuesto. Por eso el deck corre sobre la **línea neta**.

> **El ajuste es por canal, no global. Antes de dividir nada, pregunta de cada línea: ¿viene con IVA o ya está en gasto de plataforma?**

En Kabrita, verificado en el cierre de septiembre 2026:

| canal | ¿su línea trae IVA? | línea neta |
|---|---|---|
| **Google** | sí | media plan **÷ 1.16** → $26,000 ÷ 1.16 = $22,413.79 |
| **TikTok** | sí | media plan **÷ 1.16** → $30,000 ÷ 1.16 = $25,862.07 |
| **Meta** | **no** — ya viene en gasto de plataforma | **igual al media plan**, sin ajuste |

- Google y TikTok cerraron en **98.0%** y **96.5%** de esa base —consumieron su orden—; contra su columna bruta se leerían al 84.5% y 83.2%, y esos ~16 puntos son el impuesto.
- **Dividir la línea de Meta da 112% de cumplimiento**, que es imposible. Si el porcentaje de un canal se dispara arriba de 100, su línea ya estaba neta: no la ajustes.
- **Dilo en los encabezados, no solo al pie.** Una columna llamada "media plan (con IVA)" miente en la fila de Meta, y una fila llamada "neto ÷ 1.16" sugiere que todas se dividieron. Nombra la columna por lo que es ("media plan", "línea neta · base del %"), marca con `=` la línea que entra sin ajuste y pon una nota al pie que diga **a qué canales aplica el IVA**.
- **No fuerces el 100%.** Igualar la línea neta al gasto hace que el porcentaje imprima 100 pero destruye la auditoría: la columna deja de ser el plan. Un canal que consumió su orden cae solo entre 96% y 100%; dilo con el número real y llámalo "consumió su orden".
- **Todas las métricas de eficiencia (CPM, CPC, CPA, ROAS, mix) se calculan sobre el gasto de plataforma.** No mezclar bases.

Muestra **las dos columnas** —media plan (con IVA) y línea neta— más el gasto y el %, para que la cadena sea auditable de un vistazo. En la tabla de la serie del año, donde la columna de asignación trae el bruto de cada mes, agrega una **sub-fila «↳ neto ÷ 1.16»** bajo el mes del reporte con la base neta y el % ejecutado: deja ver las dos bases sin reinterpretar los meses anteriores, cuya captura puede no ser homogénea.

## Variante lead-gen / email (TBP)

Misma estructura, pero los KPIs cambian de ROAS/compras a **leads, costo por lead, salud del funnel, demanda orgánica**. Diferencias reales del deck TBP:

- KPIs hero: leads del periodo, alcance, costo por lead, no ROAS.
- "Operación contenida, demanda orgánica firme" — el título-conclusión reconoce un mes de baja ejecución sin maquillarlo.
- **Google bloqueado por saldo** → se reporta como hecho operativo ("una sola campaña activa"), no se esconde.
- Bloque **Orgánico · GA4**: tráfico no pagado y profundidad de sesión como motor del mes.
- Secciones numeradas explícitas ("Sección 02/03/04") como divisores.
- Cierra igual: Do's & Don'ts → Next Steps → Hoja de ruta.

## Reglas del arco

- **Abre con el veredicto.** El resumen ejecutivo va segundo (tras la portada), no al final.
- **Cada sección abre con un divisor** (slide negra/llena en RC, eyebrow "Sección 0X" en TBP) cuando el deck es largo.
- **Un título-conclusión por slide de contenido.** El `content-eyebrow` nombra el tema; el `content-title` da la lectura cuantificada.
- **Cierra mirando al futuro.** Los dos últimos bloques (Do's & Don'ts + Next Steps) son lo que el cliente acciona; nunca termines en una métrica.
- **No infles.** Si una sección no tiene dato que la sustente este mes, quítala — mejor 14 slides sólidas que 22 con relleno.
- **Tono de auditoría neutra.** Sin contrastes retóricos ("no era X, sino Y"), sin verdades absolutas, sin juicios bueno/malo. Los hallazgos se enuncian como lecturas y oportunidades de reasignación, **no como errores**: es la operación de Kar con la cuenta. "Dónde está el margen para el mes que entra" en vez de "esto se hizo mal".
- **El texto le habla al lector genérico**, no a una persona.
- **Nada de frases como "tráfico barato".**
- **Cada slide de contenido cabe en su área útil.** El builder reporta los que no (`clamp-top`): un bloque más alto que el espacio entre el header y el footer se sale por abajo y pisa el pie. Se arregla acortando el título a una línea (lo que más espacio libera) o comprimiendo filas y tarjetas — nunca dejándolo encimado.
- **Las tablas suman `tw − 60`.** El ancho de columnas debe sumar el ancho de la tabla menos el padding de los dos lados; si suma el ancho completo, la última columna se corta.
