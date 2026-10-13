# MCP multi-cuenta

Opero cuentas de varias empresas y varios clientes desde la misma Mac. La regla que ordena todo:
**una entrada de MCP = una identidad.** Nunca un servidor que vea todas las cuentas.

```
google-ads-kcl          ← MCC de la empresa A
google-ads-adglow       ← MCC de la empresa B
google-analytics-kcl    ← la cuenta de Google de la empresa A
google-analytics-tbp    ← la cuenta de Google de un cliente (otra identidad)
google-analytics-wom    ← otro cliente, otra cuenta
tiktok-kcl / tiktok-kabrita / tiktok-amperson   ← un advertiser por entrada
shopify-<tienda>        ← una tienda por entrada
google-workspace        ← la excepción: UN servidor, varias cuentas, la cuenta se elige por herramienta
```

Así, cuando una sesión pide "el GA4 de este cliente", la herramienta se llama
`google-analytics-<cliente>` y no hay manera de leer la propiedad equivocada.

## Cómo está hecho cada launcher

Los MCP oficiales de Google (`analytics-mcp`, `google-ads-mcp`, instalados con `pipx`) esperan
credenciales en variables de entorno o en un archivo ADC. En vez de pegar secretos en la config
de Claude, cada entrada apunta a un `run.sh <perfil>` que:

1. Resuelve el perfil a UN archivo `.env` (el del proyecto, o `env.<perfil>` en `~/.config/`).
2. Lee de ahí `CLIENT_ID`, `CLIENT_SECRET`, `REFRESH_TOKEN` en cada arranque.
3. Escribe un `adc-<perfil>.json` con permisos 600 (uno por perfil: si todos escribieran al
   mismo archivo se pisarían entre arranques).
4. Ejecuta el binario oficial con `GOOGLE_APPLICATION_CREDENTIALS` apuntando a ese ADC.

El `.env` del proyecto es la única fuente de verdad. Renuevas el token ahí, y el launcher lo
recoge en el siguiente arranque. Ni `~/.claude.json` ni ningún repo guardan copias.

Cada carpeta trae además un `authorize.py <perfil>` que hace el baile de OAuth en el navegador,
guarda el refresh token en el `.env` del perfil **sin imprimirlo**, verifica el puerto del
redirect (si `next dev` está en el 3000, la respuesta de Google aterriza ahí), lista lo que esa
cuenta alcanza, y registra el servidor en Claude Code con `claude mcp add`.

| Carpeta | MCP de abajo | Perfil = | Scope |
|---|---|---|---|
| [google-ads/](google-ads/) | `google-ads-mcp` (oficial, pipx) | un MCC o cuenta de Google Ads | `adwords` |
| [google-analytics/](google-analytics/) | `analytics-mcp` (oficial, pipx) | una cuenta de Google con acceso a GA4 | `analytics.readonly` |
| [google-workspace/](google-workspace/) | `workspace-mcp` (pipx) | **todas** las cuentas en un servidor; `user_google_email` elige | Gmail, Drive, Calendar, Docs, Sheets, Slides, Tasks |
| [shopify/](shopify/) | `shopify-mcp` (npm) | una tienda (token de app privada `shpat_…`) | Admin API |
| [remotos/](remotos/) | servidores HTTP/SSE de terceros | TikTok Ads por advertiser, Scrape Creators, Adyntel, ZenRows, Higgsfield, EnvoAPI | — |

[mcp-servers.example.json](mcp-servers.example.json) es mi bloque `mcpServers` de `~/.claude.json`
con los valores quitados: muestra cómo quedan registradas todas las entradas.

## Instalación (una vez)

```bash
pipx install analytics-mcp        # GA4
pipx install google-ads-mcp       # Google Ads
pipx install workspace-mcp        # Google Workspace
# Un cliente OAuth "aplicación web" en Google Cloud con redirect http://localhost:3000/oauth2callback
# y las APIs habilitadas: Google Ads API, Google Analytics Admin + Data, Gmail, Drive, Calendar, Docs, Sheets, Slides, Tasks.
```

Luego, por cada perfil:

```bash
mkdir -p ~/.config/google-analytics-mcp && cp google-analytics/{run.sh,authorize.py} ~/.config/google-analytics-mcp/
python3 ~/.config/google-analytics-mcp/authorize.py <perfil>     # navegador → token → claude mcp add
```

Reinicia Claude Code. La herramienta nueva aparece como `mcp__google-analytics-<perfil>__*`.

## Trampas que ya pagué

- **`MCP_TIMEOUT`.** Los MCP de Google tardan en arrancar. Sin `"env": {"MCP_TIMEOUT": "60000"}`
  en `settings.json`, Claude los da por muertos.
- **"Connection closed" al arrancar = el launcher no encontró el `.env`.** Casi siempre porque se
  movió el repo. Corre `run.sh <perfil>` a mano en una terminal: el mensaje de error lo dice.
- **Un perfil, una cuenta.** Correr `authorize.py` dos veces con el mismo nombre de perfil pisa
  el token anterior y solo sobrevive la última cuenta. El script lo advierte y pide `--force`.
- **Claude Code sí expande `${VAR}` en los headers de un MCP remoto** (scope `user`). Verifícalo
  con `claude mcp list`, no con `claude mcp get`: el segundo muestra el literal sin expandir.
- **Los MCP no se automatizan.** Una rutina desatendida (launchd, cron) que llama un conector MCP
  se cuelga en silencio. Lo desatendido va por API con credencial. Ver [../automatizaciones/](../automatizaciones/).
- **Un MCP remoto con OAuth (Higgsfield) pide reiniciar la sesión** después de autorizar, aunque
  `/mcp` ya diga "Connected".
- **El conector oficial de Shopify sostiene una tienda a la vez.** Por eso el MCP local por tienda.
