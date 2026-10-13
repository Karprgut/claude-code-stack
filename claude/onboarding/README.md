# Onboarding — Forma de trabajar de Karma Creative Lab

Hola 👋 Este paquete tiene **todo lo que uso para trabajar con Claude Code**: los skills que hemos creado, la configuración de los MCPs (conectores) y la guía para empezar desde Visual Studio Code.

La idea es que en ~1 hora tengas tu entorno igual al mío y puedas operar los proyectos de la agencia.

---

## Por dónde empezar (en orden)

| # | Guía | Para qué |
|---|------|----------|
| 1 | [01-vscode-y-claude-code.md](01-vscode-y-claude-code.md) | Instalar VS Code + la extensión de Claude Code y entrar por primera vez |
| 2 | [02-skills.md](02-skills.md) | Qué es un skill, catálogo completo de los que usamos, y cómo instalar el paquete `karma-skills.tar.gz` |
| 3 | [03-mcps.md](03-mcps.md) | Conectar los MCPs (Brevo, Zapier, Gmail, Calendar, Drive, Meta, Canva) |
| 4 | [04-flujo-de-trabajo.md](04-flujo-de-trabajo.md) | Cómo trabajo día a día: estructura de clientes, CLAUDE.md, memoria, reglas |

## Qué viene en este paquete

```
onboarding-angel/
├── README.md                      ← este archivo
├── 01-vscode-y-claude-code.md
├── 02-skills.md
├── 03-mcps.md
├── 04-flujo-de-trabajo.md
└── (karma-skills.tar.gz)          ← en el repo público no va: las skills propias están en skills/
```

## Resumen de 30 segundos

1. Instala **VS Code** y la extensión **Claude Code** → inicia sesión con tu cuenta Anthropic.
2. Descomprime `karma-skills.tar.gz` dentro de tu carpeta `~/.claude/skills/`.
3. Conecta los MCPs que necesites (la mayoría se conectan una sola vez con tu propia cuenta).
4. Abre el repo del cliente en VS Code y empieza a pedirle cosas a Claude en lenguaje natural.

> ⚠️ **Importante sobre credenciales:** este paquete NO incluye mis llaves ni mis cuentas personales. Cada MCP lo conectas con TUS propias credenciales (te explico cómo en la guía 03). Pídeme los accesos que necesites compartidos (p. ej. la cuenta de Meta de un cliente).
