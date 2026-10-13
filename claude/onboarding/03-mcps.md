# 3 · MCPs (conectores) — configuración

Un **MCP** (Model Context Protocol) es un conector que le da a Claude acceso a un servicio externo: leer tu Gmail, mandar correos por Brevo, sacar métricas de Meta Ads, etc. Sin MCP, Claude solo ve archivos; con MCP, opera tus herramientas.

Hay **dos tipos** en mi setup:

1. **Conectores de tu cuenta Claude (claude.ai)** — se activan una sola vez desde tu cuenta y aparecen en Claude Code automáticamente. Son los que empiezan con `claude_ai_*`: Gmail, Google Calendar, Google Drive, Meta, Canva, Zapier.
2. **MCPs configurados por archivo** — se declaran en un JSON con su URL y credenciales. En mi caso: **Brevo** (por proyecto) y **Zapier-MCP** (global).

> 🔐 **Regla de oro:** cada quien usa SUS propias credenciales. No copies mis llaves. Para servicios de un cliente (ej. la cuenta de Meta Ads de Kabrita), yo te doy acceso como usuario, no mi token.

---

## 3.1 Conectores de cuenta (los `claude_ai_*`)

Estos NO se configuran con archivos. Se conectan desde tu cuenta:

1. Entra a **claude.ai** → **Settings → Connectors** (o desde la app de Claude).
2. Conecta los que necesites e inicia sesión con la cuenta correspondiente:

| Conector | Para qué lo uso | Con qué cuenta lo conectas |
|---|---|---|
| **Gmail** | Borradores de reportes, búsqueda de hilos, etiquetas | Tu correo de la agencia |
| **Google Calendar** | Agendar, revisar y sugerir horarios | Tu Google de la agencia |
| **Google Drive** | Leer/crear/buscar archivos y docs | Tu Google de la agencia |
| **Meta (Ads)** | Métricas, campañas, audiencias, pixel — alimenta los post-mortems | Te agrego a las cuentas de anuncios de cada cliente |
| **Canva** | Diseños, exports, templates de marca | Tu Canva (o el de la agencia) |
| **Zapier** | Automatizaciones (ver también 3.3) | Tu cuenta Zapier |

3. Una vez conectados en claude.ai, abre Claude Code y deberían estar disponibles. La primera vez que Claude use uno, puede pedirte autorizar (`/mcp` lista el estado de cada conector).

> Para las cuentas de Meta de clientes: avísame y te agrego con tu correo. Nunca compartas tokens de Meta por chat.

---

## 3.2 Brevo (MCP por proyecto)

Brevo es el motor de email/CRM que uso en **TBP** (formulario de contacto + flujos). Se configura **por proyecto** con un archivo `.mcp.json` en la raíz del repo.

**Cómo lo conectas (con TU API key de Brevo):**

1. Consigue tu API key en Brevo: **Settings → SMTP & API → API Keys → Generate**.
2. En la raíz del proyecto que lo necesite, crea/edita `.mcp.json`:

```jsonc
{
  "mcpServers": {
    "brevo": {
      "type": "http",
      "url": "https://mcp.brevo.com/v1/brevo/mcp",
      "headers": {
        "Authorization": "Bearer TU_API_KEY_DE_BREVO_AQUI"
      }
    }
  }
}
```

3. Habilítalo en el proyecto: crea/edita `.claude/settings.local.json` en el mismo repo:

```json
{
  "enabledMcpjsonServers": ["brevo"]
}
```

4. Reinicia el chat. Verifica con `/mcp`.

> ⚠️ El `.mcp.json` con la llave NO debe subirse a Git. Confirma que esté en `.gitignore`. Si necesitas la llave compartida del cliente en vez de la tuya, pídemela por un canal seguro (no por chat).

---

## 3.3 Zapier-MCP (global)

Lo tengo configurado **global** (aplica a todas las carpetas), para automatizaciones tipo "manda esto a tal Zap". Vive en `~/.claude.json`.

**Cómo lo conectas:**

La forma más simple es por terminal con el CLI de Claude:

```bash
claude mcp add --transport http Zapier-MCP "TU_URL_DE_ZAPIER_MCP" --scope user
```

- La **URL de tu servidor Zapier MCP** la generas en https://mcp.zapier.com (crea un servidor, copia el endpoint).
- `--scope user` lo hace global a tu usuario.
- La primera vez, corre `/mcp` dentro de Claude Code y elige **autenticar** Zapier (abre el navegador para OAuth).

> Si prefieres no usar Zapier al inicio, puedes saltártelo. No es crítico para el flujo diario.

---

## 3.4 Comandos útiles de MCP

Dentro del chat de Claude Code:

- `/mcp` — lista todos los MCPs, su estado (conectado / requiere auth) y permite autenticar.
- Si un conector dice "needs auth", córrelo desde `/mcp` y autoriza en el navegador.

Por terminal:

```bash
claude mcp list          # ver MCPs configurados
claude mcp get brevo     # detalle de uno
claude mcp remove brevo  # quitarlo
```

## ✅ Checklist

- [ ] Conectaste en claude.ai los conectores que vas a usar (mínimo Gmail + Drive + Meta).
- [ ] `/mcp` muestra los conectores en verde / autenticados.
- [ ] Si trabajas TBP: `.mcp.json` con TU llave de Brevo + `enabledMcpjsonServers`.
- [ ] (Opcional) Zapier-MCP agregado y autenticado.
