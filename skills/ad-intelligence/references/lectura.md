# Cómo leer y presentar estas cifras

La diferencia entre inteligencia competitiva y adivinanza con tablas es saber
**qué número se puede defender en una junta y qué número no**. Este archivo es
esa frontera.

---

## Las cuatro clases de confianza

| Clase | Qué es | Cómo se presenta |
|---|---|---|
| **A · medido** | La plataforma publicó la cifra: `eu_total_reach` del DSA, rangos de impresiones de Meta | Punto, o el rango que dio la plataforma |
| **B · calibrado** | Estimado con `k` y `CPM` de **cuentas propias** del mismo mercado y vertical | Punto, **citando con qué se calibró** |
| **C · benchmark** | Estimado con benchmark genérico de industria | **Siempre rango (±45%)**, nunca punto |
| **— · no estimable** | Sin constante para ese corte | Reporta el creativo-día (que es un hecho) y declara la inversión no estimable |

**Cada cifra carga su clase.** Esto es exactamente lo que AdClarity *no* hace:
presenta `Estimated Ad Spend: $X` sin decir de dónde salió. Un número exacto
sobre un benchmark genérico es teatro de precisión.

Los agregados heredan el ancho: si un sumando es clase C, el total es un rango.

---

## Qué se defiende y qué no

### ✅ Se defiende como cifra

**Share of Voice por creativo-días: `SoV_i = CD_i / Σ CD`.** Es **exacto por
definición, no estimado** — es la participación de presencia sostenida y nada
más. Esa parte no depende de ninguna calibración.

> ⚠️ **Corrección importante.** Una versión anterior de esta skill decía que el
> SoV "no arrastra error de calibración porque k y CPM se cancelan". **Eso era
> falso como estaba escrito**, y hay que desarmarlo bien porque el error es
> sutil:
>
> La cadena colapsa a `inversión = creativo-días × ($/CD)`, donde `$/CD` es por
> definición `inversión / creativo-días`. O sea que **k y CPM son solo una
> descomposición de esa razón**. Decir "se cancelan" es decir que el costo por
> creativo-día es estable — que es una **afirmación empírica, no algebraica**.
>
> El álgebra sí se sostiene *dentro del modelo* (todos los anunciantes del corte
> reciben la misma constante, así que aparece arriba y abajo). Pero eso solo
> prueba **consistencia interna del sistema**, no que el SoV estime bien el
> reparto real de inversión. La prueba automatizada que metía 100× de error
> demuestra lo primero y **no** lo segundo.

**Lo que el SoV de creativo-días NO es: un proxy insesgado del reparto de
inversión.** Eso depende de la **dispersión del `$/CD` dentro del set**:

```
Cliente A    $329/CD
Amperson   $206/CD        dispersión 1.6×
```

Con esa dispersión y un set balanceado, la brecha entre participación de
creativo-días y participación de inversión ronda **±12 puntos porcentuales**.
Es un sesgo **real, pero acotado y medible con las cuentas propias** — no un
supuesto ciego.

**Fraseo correcto:** *"Nu sostiene el 67% de los creativo-días de la
categoría"* (exacto). **No:** *"Nu tiene el 67% de la inversión"* (eso carga
±12 pp).

### 🔎 El predictor de falla, que es lo más aprovechable

El modelo acierta exactamente cuando el `$/CD` se mantiene entre la cuenta con la
que calibraste y el anunciante que estimas. Medido en cuentas propias (jul→ago
2026, PMax):

| Qué se movió | Resultado |
|---|---|
| **Cambió el presupuesto, el precio estable** | `k` cae sola, nada la compensa → **el error pasa entero al estimado** |
| **Cambió el precio, el presupuesto estable** | `k` sube, el CPM baja → **se cancelan**, el estimado aguanta |

**El modelo falla cuando un anunciante cambia presupuesto sin cambiar la
cantidad de creativos vivos.** Y eso es **diagnosticable antes de reportar**:
basta ver si los creativo-días siguieron o no al cambio de ritmo. Si un
competidor mantiene sus piezas planas mientras todo indica que movió inversión,
**no reportes su inversión estimada** — reporta creativo-días y di por qué.

También se defienden, porque son hechos observables y no estimaciones:

- Número de creativos activos
- Fechas de primera y última aparición
- Longevidad y vida promedio por pieza
- Presencia o ausencia en una plataforma ← **el hallazgo más accionable**
- Copy, formato y ángulo de mensaje

### ⚠️ Solo como orden de magnitud

- Inversión estimada
- Impresiones estimadas fuera de la UE
- CPM del competidor (en realidad es *tu* CPM aplicado a su volumen)

Fraseo que funciona: *"del orden de $180k–$470k MXN en el trimestre"*, nunca
*"invirtió $327,410"*.

### ⚠️ No sale de aquí, pero **sí se puede comprar** (no requiere panel)

Corrección a la lectura inicial: publisher, placement y método de compra **no
requieren un panel — requieren un panel *o un crawler***. Son dos formas de
observar lo mismo.

| Dato | Con qué se obtiene |
|---|---|
| Desglose por publisher | **Adbeat** ($249/mes) — rastrea el publisher directo |
| Placement en pantalla | Adbeat, parcial, solo web abierta |
| **Método de compra** | Adbeat — extrae el **ad tag** y traza la ruta red→DSP→SSP |

Adbeat cubre **México y España**. El sesgo del crawler: ve lo que le sirven *a un
crawler*, no a una persona — ciego a retargeting, personalizados, feeds sociales
y CTV. Ahí es donde el panel (AdClarity, Pathmatics) sigue ganando.

La sinergia es exacta: `adintel` cubre los jardines amurallados con bibliotecas;
un crawler cubre la web abierta. Si la categoría es intensiva en display
programático, **recomienda Adbeat en vez de aproximar**.

### ❌ Irreducible sin panel

- **Presión de entrega real** — el sesgo estructural, ver abajo
- **CTR o conversiones del competidor**
- **CTV / TV lineal**

Si te piden estos tres, la respuesta correcta es: *"eso requiere panel de
usuarios; lo tiene AdClarity y no se aproxima"*. **No lo inventes.** Para la
presión de entrega, una encuesta de recordación (Pollfish, ~$0.95/respuesta) da
una lectura independiente que **triangula** el SoV — no lo mide, lo contrasta.

---

## Los siete sesgos, y cómo se declaran

1. **No se observa presión de entrega.** *El* sesgo estructural. Dos anunciantes
   con las mismas piezas vivas los mismos días salen iguales, aunque uno haya
   invertido el triple. Sin panel no se corrige — solo se declara.
2. **`k` escala con el presupuesto de la cuenta, no con la plataforma.** Aplicar
   el `k` de una cuenta chica a un competidor grande subestima, y al revés.
3. **La ventana `first_seen → last_seen` sobreestima.** Da por activo todo el
   intervalo, incluyendo pausas. Los polls diarios propios lo corrigen; mientras
   no haya, el sistema degrada la confianza a C automáticamente.
4. **El SoV es relativo al set elegido.** Una marca fuera de la lista no está en
   el denominador. **No es participación de mercado real** — escríbelo en la
   salida, no lo dejes implícito.
5. **La programática pura fuera de Google es punto ciego.** Un competidor que
   invierte sobre todo ahí se verá artificialmente pequeño. Si la categoría es
   intensiva en programática (seguros, automotriz, retail grande), dilo — o
   recomienda Adbeat.
6. **Adyntel no trae historia de Meta, solo el presente.** ⚠️ **El error más
   caro del sistema, y está medido.** En la validación contra una cuenta real, las
   piezas de Meta en la base arrancaban todas en la fecha de ingesta: para
   mar–ago el modelo estimó **$0** en Meta contra **la inversión real (seis cifras en MXN)**. El
   total del modelo para *todas* las plataformas quedó por debajo del real de
   una sola.

   **Consecuencia operativa:** para periodos anteriores a tu primera ingesta,
   **Meta está subestimado o en cero**. No presentes un histórico de Meta que no
   coleccionaste. Google sí tiene profundidad real (`first_seen` desde 2023).
7. **Un CPM único no representa el año.** En una cuenta real, mar–ago, el
   CPM real fue de **11.34 a 74.68 — 6.6× de rango**. Aplicar la calibración de
   un mes a otro puede errar ~2.5×. **Calibra por periodo**, no con un punto.

---

## Plantilla de nota al pie

Para cualquier entregable que salga de aquí y llegue a un cliente:

> **Fuente y método.** Creativos observados en las bibliotecas públicas de
> anuncios de Meta y Google (<fechas>). El Share of Voice se calcula sobre
> creativo-días —un creativo activo un día en una plataforma— y es **relativo al
> set de competidores analizado**, no participación de mercado. La inversión
> estimada se deriva de constantes calibradas con <cuentas propias / benchmarks
> de industria> y debe leerse como **orden de magnitud**. No incluye desglose por
> publisher, placement ni método de compra —esos datos requieren un crawler
> dedicado o un panel de medición— ni CTV. La cobertura de Meta se limita al
> periodo en que el sistema estuvo coleccionando; periodos anteriores pueden
> estar subrepresentados.

---

## Enganche con otras skills

- **`adglow-rigor-planeacion`** — mismo principio anti-alucinación: cita la
  fuente o no pongas el número. Si el análisis va a un plan de medios, esa skill
  lo audita.
- **`post-mortem-consulta`** — de ahí salen los datos de cuentas propias que
  **calibran** este modelo. Corre esa primero si quieres subir de clase C a B.
- **`adglow-slides` / `ckm-slides`** — para vestir los hallazgos en deck. Esta
  skill no arma decks.
