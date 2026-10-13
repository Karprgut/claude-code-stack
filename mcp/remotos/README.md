# MCP remotos (HTTP / SSE)

Servidores de terceros que no corren en tu Mac. La identidad va en un header o en OAuth.

## TikTok Ads: un advertiser por entrada

```bash
claude mcp add --transport http tiktok-<cliente> https://business-api.tiktok.com/open_mcp/tt-ads-mcp-flat
# luego /mcp en una sesión interactiva → OAuth con la cuenta de TikTok que ve ese advertiser
```

Registra una entrada por cliente (`tiktok-kcl`, `tiktok-kabrita`, …). Cada OAuth se hace con la
cuenta correcta. Trampas de la API: el calendario va en **UTC** aunque `display_timezone` diga
otra cosa; `ad_update` exige el creativo completo, no solo el campo que cambias; el presupuesto
`TOTAL` es acumulado, no por día.

## Scrape Creators: una key en un solo lugar

```bash
# ~/.config/scrapecreators/env  →  SCRAPECREATORS_API_KEY=...
claude mcp add --transport http scrapecreators https://api.scrapecreators.com/mcp \
  --scope user --header "x-api-key: ${SCRAPECREATORS_API_KEY}"
```

Claude Code **sí expande `${VAR}`** en los headers (scope `user`) si la variable está en el
entorno donde arranca. Expórtala desde tu perfil de shell leyendo el archivo
(`set -a; source ~/.config/scrapecreators/env; set +a`). Verifica con `claude mcp list`; `claude
mcp get` muestra el literal sin expandir y engaña. La misma key la consumen el MCP, la skill
[`scrapecreators-api`](../../skills/scrapecreators-api/) y el CLI.

## Adyntel (bibliotecas de anuncios)

```bash
claude mcp add --transport sse adyntel https://mcp.adyntel.com/sse --scope user \
  --header "X-Adyntel-Email: ${ADYNTEL_EMAIL}" --header "X-Adyntel-Api-Key: ${ADYNTEL_API_KEY}"
```

## ZenRows (scraping con navegador remoto)

```bash
claude mcp add zenrows --scope project -e ZENROWS_API_KEY=${ZENROWS_API_KEY} -- npx -y @zenrows/mcp
```

## Higgsfield (video generativo) y EnvoAPI (LinkedIn)

```bash
claude mcp add --transport http higgsfield https://mcp.higgsfield.ai/mcp --scope user
claude mcp add --transport http envoapi https://api.envoapi.com/mcp --scope user
```

Los dos autorizan por `/mcp` en una sesión interactiva. **Higgsfield pide reiniciar la sesión**
después del OAuth aunque diga Connected, cobra los créditos del plan y no se puede automatizar.
EnvoAPI es el único "MCP de LinkedIn" que funciona de los que probé: los de GitHub que prometen
la API v2 de LinkedIn apuntan a endpoints que no existen.
