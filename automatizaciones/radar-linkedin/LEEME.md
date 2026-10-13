> **Ejemplo real.** Es el radar que corre a diario para mi agencia. Cambia los fraseos (`QUERIES_*` en `radar.py`) por los de tu mercado y disciplina, y el sistema visual en `build.py`. Ver [../README.md](../README.md).

# Radar de demanda

Busca en LinkedIn empresas que piden **agencia** de marketing digital en
**México, Colombia, Perú y Estados Unidos**. Identidad visual: Adglow.

Artifact: https://claude.ai/artifact/<ID>

## Automático

`~/Library/LaunchAgents/io.ejemplo.kcl-radar.plist` corre `run.sh` **a las 10:00**
todos los días: barre, arma el HTML y republica el artifact en la misma URL.
**Está cargado.** Para apagarlo:

    launchctl unload ~/Library/LaunchAgents/io.ejemplo.kcl-radar.plist

## A mano

    ./run.sh                     # ciclo completo: barrido + build + publicar
    ./run.sh --solo-build        # sin publicar
    python3 radar.py --dias 14   # solo el barrido
    python3 radar.py --dry-run   # sin marcar vistos (para calibrar)
    python3 build.py             # solo rearmar el HTML
    python3 test.py              # clasificador: 12 casos reales
    python3 test_mercado.py      # detector de país: 10 casos

Credenciales: Exa en `~/.config/kcl-radar/env`, ScrapeCreators en
`~/.config/scrapecreators/env`. Logs en `logs/`.

**Costo por corrida:** US$ 0,18 de Exa (el barrido) + 1 crédito de ScrapeCreators
por prospecto nuevo (el enriquecimiento). Con ~7 al día, los créditos se van en
unas dos semanas. `--sin-enriquecer` apaga la segunda parte; el radar sigue
funcionando, solo que sin autor ni competencia.

## Cuarenta fraseos por corrida

- **14 solo de México** — por ciudad (CDMX, Monterrey, Guadalajara, Querétaro,
  Mérida…) y por tipo de encargo. Es el mercado principal y va con más
  resultados por fraseo que el resto.
- **10 por disciplina** — paid, CRM y automatización, programática, audiencias
  y data, IA aplicada a marketing, retail media y shopper, medios offline
  (TV, radio, OOH, prensa), analítica y medición, martech, influencers, PR y
  activaciones. Quien busca "agencia de CRM" nunca escribe "agencia de
  marketing digital": por eso cada disciplina se barre aparte.
- **5 del resto** — Colombia, Perú, convocatorias y nichos raros.
- **11 en inglés** para Estados Unidos.

Costo: ~US$ 0,85 de Exa por corrida (unos US$ 25 al mes) más 1 a 2 créditos de
ScrapeCreators por prospecto nuevo.

**No muevas ni borres los CSV de `salidas/`**: el artifact se arma leyendo todos
los `radar-*.csv` de los últimos 30 días. Si los archivas, el tablero pierde el
histórico y solo muestra lo que encontró esa mañana.

## Dos fuentes

- **Exa**, en español, para México, Colombia y Perú.
- **ScrapeCreators**, en inglés, para Estados Unidos. Por dentro es Google
  indexado: en inglés devuelve posteos del mismo día y **ya trae el posteo
  completo con autor y comentarios**, así que esos no se enriquecen aparte.
  En español devuelve ruido sin relación — por eso no se usa ahí.

Ojo con el endpoint: es `/v1/linkedin/search/posts`, no `search-posts`. El
segundo contesta 404 y se confunde con "sin resultados".

## El enriquecimiento (ScrapeCreators)

Por cada prospecto nuevo se pide el posteo a ScrapeCreators y se saca:

- **Autor y liga a su perfil** — sin esto la lista era de links anónimos.
- **País real**, del subdominio del perfil (`mx.linkedin.com`). Mucho más
  confiable que adivinarlo del texto: destapó que un prospecto que parecía bueno
  era de Indonesia, y ubicó en México y Perú a dos que estaban "sin ubicar".
- **Comentarios = competencia.** Es el dato que faltaba. Un posteo con 110
  comentarios ya tiene 110 agencias formadas delante; uno con 6 está libre. La
  lista se ordena por eso, no por fecha.

- **Ubicación exacta y empresa**, del perfil del autor (1 crédito más). "Cary,
  North Carolina" dice mucho más que "US", y la empresa te dice con quién hablas.
- **Si el autor ya cerró.** Se revisan los comentarios buscando si él mismo
  escribió "ya cerramos", "gracias a todos" o equivalente. Un posteo cerrado se
  descarta: llegar ahí es perder el tiempo.

Orden de confianza para el país: **ubicación del perfil > subdominio > texto**,
salvo que el texto apunte claro a uno de los cuatro mercados — alguien en India
que busca agencia **para** Estados Unidos sigue sirviendo.

## Qué descarta y por qué

De 127 posteos revisados pasan unos 7. Se descarta:

- **Vacantes de empleado** — más de la mitad de lo que devuelve cualquier
  búsqueda de este tipo. Sin este filtro la lista es basura.
- **Encargos de freelance o de persona** — se exige que el posteo nombre una
  agencia o consultora. "Agencia o freelancer" sí pasa, porque acepta agencia.
- **Autopromoción de agencias** — "¿Buscas una agencia de X?" le habla al lector:
  es un anuncio. La persona gramatical decide: *busco* es demanda, *buscas* es
  anuncio.
- **Otros países** — España, Argentina, Chile, Centroamérica, India y demás.

## Lo que costó aprender

- **Los SERPs están cerrados.** Google, Bing, DuckDuckGo, Mojeek y cinco
  instancias de SearXNG bloquean el scraping del operador `site:`. Exa es la
  única fuente viva sin login.
- **El lag era del ranking, no del índice.** Con el MCP gratis lo más fresco era
  de hace un mes; con `startPublishedDate` forzado por la API llegan posteos de
  hace cuatro días. El filtro de fecha es lo que destraba la frescura.
- **LinkedIn usa texto "fancy" Unicode** (𝗖𝗼-𝗙𝗼𝘂𝗻𝗱𝗲𝗿). Son code points distintos
  de las letras ASCII, así que ninguna señal pegaba y los posteos de cofundador
  entraban como demanda. Se aplana con NFKC en `norm()`.
- **Las señales cortas necesitan límite de palabra.** Sin él "usa" pega dentro
  de "usamos" y "cali" dentro de "calidad", que en español pasa todo el tiempo.
  Y "US" en mayúsculas es el país, pero "us" en minúsculas es el pronombre
  inglés de "help us scale": ese se busca sobre el texto sin normalizar.
- **El fraseo obvio está saturado.** Un "busco agencia" junta 65 comentarios de
  agencias en dos días; llegar en el lugar 66 no es ventaja. Los valiosos tenían
  3 y 5 comentarios y usaban fraseo raro ("sin IA", un vertical específico). Por
  eso hay un fraseo dedicado a nichos y señales para ese lenguaje.
- **Nombrar solo el país traía poco de LatAm**, porque los posteos no escriben
  "México": escriben CDMX, Monterrey, Bogotá. Los fraseos van por ciudad.
- **La intención se declara arriba.** El filtro decisivo no fue acumular
  señales sino exigir que el verbo de búsqueda y la palabra "agencia" aparezcan
  juntos **en los primeros 320 caracteres**. Cuando "agencia" sale hasta el
  párrafo seis, casi siempre es una agencia hablando de sí misma o una vacante
  que de paso menciona a su proveedor. Ese cambio solo subió la precisión de
  ~40% a ~80%.
- **Cuidado al calibrar con casos inventados.** Varios resúmenes escritos a mano
  pasaban la batería mientras el texto real del mismo posteo fallaba: el texto
  completo trae señales mezcladas que el resumen no. Medir siempre contra
  `salidas/crudos-*.json`, que son los posteos tal cual.

## Si tocas las señales

Corre `test.py` y `test_mercado.py` antes de dar por bueno el cambio. Los casos
salieron de posteos reales leídos uno por uno; si uno falla, el filtro se rompió.

Cada corrida vuelca `salidas/crudos-FECHA.json`, así que **recalibrar es gratis**:
se reclasifica ese JSON sin volver a llamar la API.
