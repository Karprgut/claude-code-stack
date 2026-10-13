# Productos que viven en sus propios repos

Lo que no cabe en este repo porque es un producto completo. Cada uno tiene su README.

| Producto | Qué es | Repo |
|---|---|---|
| **Flint** | Base de conocimiento personal + dashboard de marketing multiplataforma (Meta, Google, TikTok, LinkedIn). Next.js 15, iOS nativo, infra en AWS. Es también el sistema "Reports" del que beben las skills de post-mortem. Su capa de Claude (agente, worker, ingesta, insights, chat) está en [`../flint/`](../flint/) | `Karprgut/flint` (privado) |
| **Sitio de Karma Creative Lab** | Tema de Shopify brutalista + backend Next.js en Vercel con Sanity: Estrategia Inmediata, scheduler de redes, tracking server-side, sync de blog. Las piezas replicables están en [`../kcl/`](../kcl/) | `Karprgut/karmacreativelab` (privado) |
| **Prisma** (`adintel`) | Inteligencia competitiva de paid media: réplica viable de AdClarity con bibliotecas públicas de anuncios y un modelo de **creativo-días** calibrado con cuentas reales. Motor, CLI y reporte HTML. La skill [`ad-intelligence`](../skills/ad-intelligence/) es su metodología | `Karprgut/adintel` (privado) |
| **Copiloto Comercial** | Kit de ventas B2B en español para la app de Claude: 8 skills (prospectar, investigar, redactar, seguimiento, objeciones, agendar) + instrucciones de proyecto. Nunca envía nada por su cuenta | [`Karprgut/copiloto-comercial`](https://github.com/Karprgut/copiloto-comercial) |
| **Playground de decks** | Escribes el contenido en un `deck.md`, un motor lo convierte en PDF y PPTX editable con el diseño de la marca. Pensado para dos personas y sus asistentes trabajando sin pisarse | `Karprgut/playground-decks` (privado) |
| **awesome-design-md** | Colección de archivos `DESIGN.md` inspirados en sistemas de diseño de marcas conocidas, para que un agente genere UI que combine | [`Karprgut/awesome-design-md`](https://github.com/Karprgut/awesome-design-md) |
| **claude-skills-memorias** | El respaldo privado de `~/.claude/` con el [`.gitignore` por bloqueo](../claude/gitignore-bloqueo/) | `Karprgut/claude-skills-memorias` (privado) |

Los privados lo son porque tienen datos de clientes dentro, no por el código. Si te interesa
alguno, escríbeme.
