---
name: ad-intelligence
description: Inteligencia competitiva de paid media al estilo AdClarity (Semrush/BIScience) — qué anuncios corren los competidores de una marca, en qué plataformas, con qué mensajes, desde cuándo, quién domina el Share of Voice y dónde está el hueco. Úsala cuando pidan "qué está pauteando <competidor>", "el Share of Voice de <categoría>", "espía los anuncios de <marca>", "inteligencia competitiva de paid", "qué creativos corre la competencia", "réplica de AdClarity", o cuando haya que armar el slide de panorama competitivo de un pitch o de un cierre de mes. Cubre las bibliotecas públicas de anuncios (Meta, Google ATC, TikTok, LinkedIn), el MCP de Meta, el modelo de creativo-días para estimar inversión sin panel, y las reglas de presentación por clase de confianza. NO es para el desempeño de las cuentas propias (usa `post-mortem-consulta`) ni para armar el deck completo (usa `adglow-slides` o `ckm-slides`).
user-invocable: true
---

# Ad Intelligence · inteligencia competitiva de paid media

Produce el análisis que AdClarity vende, con fuentes públicas. Tres salidas
posibles, de menor a mayor esfuerzo:

| Salida | Cuándo | Cómo |
|---|---|---|
| **Respuesta directa** | "¿qué corre Nu ahora?" | MCP de Meta + ATC, contestas en chat |
| **Brief competitivo** | insumo para un pitch o cierre de mes | markdown + tabla de SoV |
| **Reporte HTML/PDF** | entregable a cliente | el repo `~/Trabajo/adintel` |

**Antes de dar cualquier cifra de inversión, lee
[references/lectura.md](references/lectura.md).** Ese archivo tiene las reglas de
presentación por clase de confianza, y son lo que separa este análisis de
inventar números.

---

## Lo que hay que saber de entrada

AdClarity **no es de Semrush** — la construyó **BIScience** y Semrush la
licencia. Su motor es un **panel opt-in de ~30M usuarios** + Smart TVs en 51
mercados, más ~650,000 publishers monitoreados. De ahí mide impresiones reales y
las proyecta al universo, luego las multiplica por un CPM de referencia para
estimar inversión — **fórmula que no publica**.

El panel es el foso y no se replica. Lo que sí:

| Se replica bien (bibliotecas) | Se compra aparte (crawler) | Irreducible sin panel |
|---|---|---|
| Inventario de creativos por marca | Desglose por publisher | Presión de entrega real |
| Fechas de vida, longevidad, rotación | Placement en pantalla | CTR del competidor |
| **Share of Voice relativo** | **Método de compra** (red→DSP→SSP) | CTV / TV lineal |
| Huecos de plataforma vs. competidor | | |
| Copy completo y ángulos creativos | | |

**Publisher, placement y método de compra NO requieren panel — requieren panel
*o crawler*.** Los da **Adbeat ($249/mes**, cubre MX y ES) extrayendo el ad tag.
Si la categoría es intensiva en display programático, **recomienda Adbeat en vez
de aproximar**. `adintel` cubre los jardines amurallados; el crawler cubre la web
abierta.

Lo que no tiene sustituto: presión de entrega, CTR ajeno y CTV. Si el cliente
necesita eso, **dilo.** No lo aproximes.

---

## Flujo

### 1 · Encuadra el set

Necesitas tres cosas antes de jalar nada. Si no las tienes, pregunta:

- **Marca** y su dominio
- **Competidores** (3–6; más de eso diluye el SoV y no cambia decisiones)
- **Mercado** (mx, es, co, us…) y **vertical**

> El SoV es **relativo al set que elijas**. Una marca que no esté en la lista no
> está en el denominador. Eso **no es participación de mercado real** y hay que
> escribirlo en la salida.

### 2 · Jala los datos

**Orden de preferencia** (detalle completo, endpoints y costos en
[references/fuentes.md](references/fuentes.md)):

1. **MCP de Meta** → `ads_library_search`. Gratis, sin scraping, ya conectado.
   Es la primera parada para cualquier consulta de Meta.
2. **Repo `adintel`** si hay que acumular histórico o generar el entregable:
   ```bash
   cd ~/Trabajo/adintel
   python3 -m adintel.cli ingest --brand "Nu México" --domain nu.com.mx \
     --market mx --vertical fintech --source all
   ```
3. **Google Ads Transparency Center** a mano para verificar:
   `https://adstransparency.google.com/?region=MX&domain=<dominio>`
4. **MCP de Semrush** (`paid_search_research`) para copy de search y PLA.
   ⚠️ Al 18-sep-2026 la cuenta **no tiene unidades de API**; si falla con
   `no_api_units`, repórtalo y sigue con lo demás.

⚠️ **La API oficial de Meta Ad Library no devuelve anuncios comerciales fuera de
la UE/UK.** Para México, la ruta es el MCP de Meta o Adyntel — nunca la API
oficial. Si alguien propone usarla para MX, corrige el supuesto.

⚠️ **Y el límite que más sesga un análisis histórico: Adyntel no trae historia de
Meta, solo el presente.** Medido contra la cuenta real de un cliente: para mar–ago
el modelo estimó $0 en Meta contra **la inversión real (seis cifras en MXN)**. Para cualquier
periodo anterior a tu primera ingesta, **Meta está subestimado o en cero** —
no presentes un histórico de Meta que no coleccionaste. Google sí tiene
profundidad real. Detalle en [references/lectura.md](references/lectura.md).

### 3 · Cuenta creativo-días, no anuncios

La unidad de análisis no es "cuántos anuncios tiene" sino **creativo-días**:

> **1 creativo-día (CD)** = un creativo, en una plataforma, activo un día.

Un competidor con 5 piezas vivas 90 días (450 CD) tiene más presencia sostenida
que uno con 40 piezas que vivieron 3 días cada una (120 CD) — y la lectura
estratégica es opuesta: el primero tiene un ganador y lo está escalando; el
segundo está en testing y no ha encontrado nada.

`SoV_i = CD_i / Σ CD`. **Es exacto por definición** — participación de presencia
sostenida, sin calibración de por medio.

⚠️ Pero **no es participación de inversión**. La brecha entre las dos depende de
la dispersión del costo por creativo-día dentro del set: medida en 1.6× entre
cuentas propias, da **±12 puntos porcentuales**. Di *"sostiene el 67% de los
creativo-días"*, no *"tiene el 67% de la inversión"*. El desarme completo del
argumento —y por qué la versión anterior de esta skill lo decía mal— está en
[references/lectura.md](references/lectura.md).

### 4 · Lee, no solo reportes

Los cinco hallazgos que valen en una junta:

1. **Quién domina y por cuánto.** "Nu sostiene 6.8× los creativo-días de
   Kapital" pega más que dos porcentajes.
2. **Huecos de plataforma.** En qué plataforma están todos menos tu marca. Es el
   hallazgo más accionable y **no necesita ninguna estimación de inversión** —
   o el creativo está ahí o no está.
3. **Creativos evergreen del competidor.** Una pieza viva 80+ días es una pieza
   que funciona. Analiza su ángulo: ese es el mensaje que les está rindiendo.
4. **Rotación como señal de estrategia.** Vida promedio corta = testing; larga =
   escalando ganadores.
5. **Ángulos ausentes.** Qué territorio de mensaje nadie está ocupando.

### 5 · Entrega

- **Brief** → markdown con tabla de SoV, huecos y lectura. Cifras de inversión
  siempre con su clase de confianza.
- **Reporte** → `python3 -m adintel.cli report --brand "X" --competitors "A,B,C"
  --market mx --vertical fintech --days 90` (HTML + PDF, marca KCL).
- **Slide para deck** → pasa los hallazgos a `adglow-slides` (sistema Adglow /
  Havas / Fantástica / Kapital) o `ckm-slides`. **No armes el deck aquí.**

---

## Cómo estimar inversión sin panel

Solo si te la piden. La cadena:

```
creativo-días → × k → impresiones → × CPM / 1000 → inversión
```

`k` = impresiones que rinde un creativo activo un día. `k` y `CPM` salen de
**cuentas propias del mismo mercado y vertical** (Kapital, Kabrita, WOM, Ruth's…):

```
k   = impresiones totales / creativo-días totales
CPM = inversión total / impresiones totales × 1000
```

Se agrega **antes** de dividir. Y `active_creatives` es anuncios con **entrega**
ese día, no anuncios que existen en la cuenta.

En el repo: `python3 -m adintel.cli calibrate --csv <archivo>`. Sin calibrar,
todo sale **clase C en rangos de ±45%** — que está bien, siempre que se presente
como rango.

**El sesgo que no se corrige y hay que declarar:** sin panel no se observa
presión de entrega. Dos anunciantes con las mismas piezas vivas los mismos días
salen iguales, aunque uno invierta el triple.

---

## Errores que hay que no cometer

| Error | Por qué importa |
|---|---|
| Presentar inversión estimada como cifra firme | Es orden de magnitud. El SoV es la cifra. |
| Usar la API oficial de Meta para MX | No devuelve comercial fuera de UE/UK. Sale vacío y parece que el competidor no pauta. |
| Llamar "participación de mercado" al SoV | Es relativo al set elegido. |
| Contar anuncios en vez de creativo-días | 40 piezas de 3 días ≠ 5 piezas de 90 días. |
| Inferir método de compra | Las bibliotecas no lo publican. Requiere crawler (Adbeat) o panel. |
| Presentar histórico de Meta que no coleccionaste | Adyntel solo trae el presente; el pasado sale en cero y parece que no pautaban. |
| Calibrar con un CPM para todo el año | En una cuenta real el CPM varió 6.6× en seis meses. Calibra por periodo. |
| Sumar creativo-días entre plataformas para comparar | El costo por creativo-día difiere por plataforma; compara **dentro** de cada una. |
| Leer el SoV de creativo-días como reparto de inversión | Carga ±12 pp por dispersión del $/CD. Son presencia, no dinero. |
| Reportar inversión de quien movió presupuesto sin mover creativos | Es el predictor de falla del modelo, y se ve **antes** de reportar. |
| Dar cifras sin decir de dónde salieron | Cada número lleva su `basis`. Ver `adglow-rigor-planeacion`. |

---

## Referencias

- [references/fuentes.md](references/fuentes.md) — matriz de fuentes: endpoints exactos, costos, límites, qué da cada una
- [references/lectura.md](references/lectura.md) — clases de confianza y reglas de presentación
- `~/Trabajo/adintel/METODOLOGIA.md` — ingeniería inversa completa de AdClarity
- `~/Trabajo/adintel/README.md` — operación del repo
