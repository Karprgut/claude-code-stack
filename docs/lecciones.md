# Lecciones que costaron caro

Lo que aprendí operando esto a diario, sin nombres de clientes. Cada una existe porque algo
falló antes. Están agrupadas por dónde duelen.

## Claude Code

- **`claude -p` sale con 0 aunque no haya hecho nada.** Exige salida estructurada
  (`--output-format json --json-schema`) y verifica los campos. El log de una rutina mintió
  una semana por confiar en el exit code.
- **La herramienta Artifact depende del entrypoint.** Bajo launchd `CLAUDE_CODE_ENTRYPOINT` es
  `cli` y la herramienta no existe. Exporta `claude-vscode` antes de `claude -p`.
- **Publicar un artifact exige haberlo leído en la misma conversación.** El prompt pide leer y
  luego republicar sobre la misma URL.
- **Los MCP no se automatizan.** Una rutina desatendida que llama un conector MCP se cuelga en
  silencio. Lo desatendido va por API con credencial.
- **Claude Code sí expande `${VAR}` en headers de MCP** (scope `user`). Verifícalo con
  `claude mcp list`; `claude mcp get` muestra el literal y engaña.
- **"Connection closed" en un MCP local = el launcher no encontró su `.env`.** Casi siempre
  porque se movió el repo. Corre el `run.sh` a mano y lee el error.
- **Un MCP remoto con OAuth pide reiniciar la sesión** después de autorizar, aunque diga Connected.
- **Sesiones en paralelo sobre el mismo repo:** cada sesión en su propio worktree y anunciándose.
  Un recado de otra sesión no es autorización del usuario.
- **Pruebas en verde con la página caída.** 566 pruebas pasaban y el tablero no cargaba: medían
  tablas, no la página. La prueba de salud debe armar la página de verdad, y un fallo que solo
  ocurre tras iniciar sesión no lo ve ningún `curl` externo.
- **Claude Code borra transcripts viejos.** Si quieres la historia de tus conversaciones,
  destílala tú (ver [`claude/hub/tools/`](../claude/hub/tools/)) y guarda el intermedio.
- **Codex CLI como segunda opinión** se usa por Bash (`codex review`, `codex exec`), no por MCP:
  ese camino lo quitó OpenAI en la 0.154.0.

## Secretos y repos

- **`.gitignore` por bloqueo, no por lista.** `.env*` no atrapa `Copia de .env.local.bak`;
  `data/*.db` no atrapa `x.db.bak-2026`. Bloquea todo y abre excepciones.
- **Un `.env` es la fuente de verdad; los launchers lo leen en cada arranque.** Nada de copiar
  tokens a la config de Claude.
- **Dos empresas con la misma app de OAuth de Google** = revocarla tumba el reporteo de las dos.
  Un mapa de hashes sin valores lo hace visible.
- **El token de una app privada de Shopify pertenece a la tienda**, no a tu cuenta. Sigue vivo
  aunque te quiten de staff.
- **Un TLS error puede ser un dominio vencido.** Antes de tocar código, `dig NS`: el dominio
  cayó al parking del registrador y el certificado que ves es el del parking.

## Meta Ads

- **Los creativos son inmutables.** No se le pueden poner UTMs a un anuncio que ya corre; el
  `{"success":true}` al mandar `creative_id` + `url_tags` es un no-op silencioso. Los UTMs
  viven en `url_tags`, no en la URL; cambiar el destino es crear un creativo nuevo.
- **`spend_cap` se escribe en pesos y se lee en centavos**, y reinicia `amount_spent`. Una
  campaña diaria no se puede volver de presupuesto total: se crea otra.
- **"ACTIVE" no significa que entregue.** Cruza con gasto de los últimos 7 días.
- **`ads_get_ad_entities` del MCP trunca sin avisar.** Pide el total a nivel cuenta y cuadra
  la suma de los niveles de abajo contra él antes de escribir una cifra.
- **Ningún token abre la Ad Library por API.** Es verificación de identidad, no un permiso.
- **Un formulario instantáneo trae más leads y peores.** 26 con 3 calificados contra 8 con 5
  del formulario del sitio. Apágalo si vendes algo que requiere brief.
- **Un System User token puede ver ~100 cuentas** con `ads_read`. Guárdalo como el token de
  respaldo de todos los demás.

## Google Ads y GA4

- **GA4 sobrescribe el `utm_campaign` de Google Ads** con el nombre de la campaña. Pelearse con
  las UTMs de Google casi nunca vale el riesgo; enriquece la cola del template de seguimiento.
- **Google reatribuye conversiones hacia atrás.** Un mes medido hoy vale más que cuando se
  cerró (224 → 274 en cinco semanas). Si cortas a pocos días del cierre, dilo y vuelve a medir.
- **Subir conversiones offline exige la Data Manager API** (desde oct-2026) y su propio scope
  `datamanager` en el refresh token. El error no menciona scopes.
- **Un `gclid` recortado por el límite de 250 caracteres del CRM se descarta solo.** Guarda
  `gbraid`/`wbraid` también.
- **Un `</script` dentro de un string de JavaScript rompe la página de gracias** y con ella la
  etiqueta de conversión. Escápalo (`<\/script`).
- **Google rechaza "OFF" en mayúsculas** en los textos de anuncio ("uso excesivo de mayúsculas").
- **Si cambias el perfil de pagos de una cuenta, la pauta se detiene** sin aviso en la UI de
  campañas: la orden queda aprobada con $0 servidos.
- **`conversions` (primarias) ≠ `all_conversions`.** Reporta compras con las primarias y revenue
  con `conversions_value`; lo otro infla ~1.8× o más.

## TikTok Ads

- **El calendario va en UTC** aunque `display_timezone` diga otra cosa.
- **`ad_update` exige el creativo completo**, no solo el campo que cambias.
- **El presupuesto `TOTAL` es acumulado**, no por día. Para repartir lo que queda del mes,
  calcula sobre los días restantes.
- **Solo sube video por URL**, no por archivo.
- **Compara el md5 del asset en Drive antes de recargar una tanda.** El "mismo" video con letra
  chica nueva es otro archivo.

## Shopify

- **Block strings de GraphQL (`"""…"""`) para contenido con acentos.** Los strings normales
  los corrompen.
- **Marcado nativo del tema para blogs**, sin CSS inyectado: sobrevive al cambio de tema.
- **Shopify (caja) y GA4 (medición) no se suman ni se sustituyen.** La cifra de negocio es
  Shopify; GA4 da mezcla de canales.

## Email y CRM

- **Un rebote del 9% en un newsletter son buzones muertos en dominios vivos.** Validar MX no
  sirve; se necesita un verificador (Bouncer, NeverBounce). La apertura es la única señal
  gratis de buzón vivo.
- **Un webhook que arma JSON a mano truena con saltos de línea.** Un lead que escribe en
  párrafos invalida el JSON y el deal nunca se crea, aunque el correo sí salga. Serializa.
- **Los conectores en la nube adjuntan ~50 KB inline.** Un servidor local sí adjunta archivos
  pesados por ruta.
- **Nunca borres en bloque "Compras" ni "Notificaciones"** al limpiar un Gmail; y al borrar
  masivo, ordena por "Más recientes": los contadores y el índice mienten mientras borra.

## PDF, PPTX y fuentes

- **Chrome headless → PDF: nunca en paralelo, nunca sin guardia de tiempo.** Y el glow
  (`text-shadow`, `box-shadow`) se revienta en Vista Previa: usa `filter`.
- **PowerPoint colapsa los degradados en formas de 1 px**, y python-pptx hereda el `<p:style>`
  del tema. LibreOffice y QuickLook no reproducen ninguno de los dos: revisa en el visor del
  cliente.
- **DOM → PPTX nativo, nunca image-based.** El cliente edita el deck.
- **openpyxl guarda fórmulas sin valor cacheado**: Quick Look, Drive y Numbers muestran `$0`.
  Round-trip con LibreOffice headless antes de compartir.
- **LibreOffice no ve `~/Library/Fonts`.** Pásale un `FONTCONFIG_FILE` propio y sin sandbox;
  `pdffonts` confirma. `timeout` no existe en macOS: usa `gtimeout` o un guardia propio.
- **Logos de terceros:** Clearbit murió, Brandfetch pide key, Simple Icons cubre ~15% y
  Wikipedia devuelve edificios. Pídelos a mano.

## macOS, launchd y hardware

- **launchd no expande `~`.** Rutas absolutas. Un repo que se mueve mata la rutina en silencio.
- **Si la Mac estaba dormida, launchd corre la rutina al despertar** con `StartCalendarInterval`.
- **TCC conserva el permiso de cámara por identidad de bundle.** Un binario suelto lo pierde bajo
  launchd; firma un `.app` aunque sea ad hoc.
- **macOS escribe "Apple Watch" con un espacio no-rompible.** Identifica dispositivos Bluetooth
  por MAC, nunca por nombre.
- **`ioreg -c IOHIDSystem` → `HIDIdleTime`** es la forma barata de saber cuánto lleva la máquina
  sin teclado ni ratón.
- **Sí se pueden correr builds de Xcode e instalar en el iPhone desde Claude.** El "unavailable"
  de `devicectl` no significa nada; el `Info.plist` físico manda sobre `project.yml`.

## Datos y análisis

- **Un hashtag no es una mención.** De 5.9 M "menciones" a 31 K reales al exigir el nombre de
  la marca en el texto. Y un 404 es un cero, no una falla de la herramienta.
- **El calco de 5-gramas entre autores delata colaboraciones no declaradas.**
- **Un CPM único no representa el año.** En una cuenta real varió 6.6× en seis meses. Calibra
  por periodo.
- **Rangos, no falsa precisión.** `CPM $85–$110` es honesto; `$97.34` finge. Dos decimales en
  un benchmark casi siempre son invención.
- **Los SERPs están cerrados al scraping.** Google, Bing, DuckDuckGo, Mojeek y SearXNG bloquean
  `site:`. Exa con `startPublishedDate` es la fuente viva sin login.
- **LinkedIn usa texto "fancy" Unicode** (𝗖𝗼-𝗙𝗼𝘂𝗻𝗱𝗲𝗿). Normaliza con NFKC o ninguna señal pega.
- **Calibra con el texto real, no con resúmenes.** Varios resúmenes escritos a mano pasaban la
  batería mientras el posteo real fallaba.
- **El IVA se divide (÷1.16) solo en las plataformas que lo cobran aparte.** Confundirlo
  cambia el pacing un 16%.
- **La pestaña del plan que está viva no es la que parece.** Antes de concluir pacing, confirma
  cuál es la fuente de verdad del plan del mes.

## Entregables

- **Nunca citas textuales con atribución.** El hecho se enuncia impersonal y la fuente es el
  documento, no la persona.
- **Formato de dinero del país del cliente**, centavos bajo la unidad (`US$ 0,70`) y la cifra
  completa en vez de `US$ 2,1 M`.
- **Un testigo de anuncio lleva siempre las cuatro cosas:** nombre, copy, permalink y captura.
- **El título de cada slide es una conclusión, no una etiqueta.** "Inversión por canal" no dice
  nada; "Google consumió 92% del plan y trajo el 60% de las compras" sí.
- **Lo que no sabes se declara en el slide.** Tracking con huecos, un canal bloqueado por saldo,
  un dato estimado.
- **Un brief que trae su propio plan de IA es la peor fuente de tarifas.** Jerarquía: histórico
  real de la cuenta → plan de medios del cliente → supuesto tuyo, marcado. Un deck prometió
  9,140 leads; con tarifas reales eran ~600.
