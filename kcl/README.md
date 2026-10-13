# KCL: lo que vive en los repos de la agencia

Karma Creative Lab es mi agencia. Su sitio corre en Shopify (tema propio) con un backend en
Next.js en Vercel. Estas son las piezas que construí ahí y que se pueden levantar en otra
tienda o en otra agencia. Cada carpeta trae lo necesario para entender y replicar la pieza;
ninguna es el repo completo (el tema y el backend son privados), así que los módulos del
backend importan rutas como `@/lib/...` o `@/sanity/...` que debes resolver en tu proyecto.

| Carpeta | Qué hace | Stack |
|---|---|---|
| [tracking-shopify/](tracking-shopify/) | Tracking consolidado de una tienda Shopify: `dataLayer` del storefront a GTM, y la **compra solo por servidor** (webhook `orders/paid` → Meta CAPI + TikTok Events API) para contar una sola vez. Google Ads importa `purchase` desde GA4 sin código | Liquid + Next.js + GTM |
| [estrategia-inmediata/](estrategia-inmediata/) | Un producto que se compra en la tienda: wizard de 8 preguntas → **motor de reglas determinista** reparte el presupuesto de medios → Claude redacta la estrategia → el webhook de pago dispara la generación → correo con el entregable y **extensión de la página de "Gracias"** que hace polling hasta mostrar el botón "VER MI ESTRATEGIA" | Liquid + Next.js + Anthropic SDK + Shopify UI Extensions + Resend |
| [scheduler-social/](scheduler-social/) | Calendario de publicaciones: posts programados, promoción de borradores, sincronización de fechas con Shopify, auto-ruteo, cargas masivas de arte, blog y copy, y el cron que publica | Next.js API routes + Sanity |
| [case-studies-builder/](case-studies-builder/) | Los case studies del blog **no se escriben en HTML**: un `csN.py` declara secciones (hero, texto, capturas, diagramas SVG, tablas, callouts) y el motor genera el preview y el fragmento para Shopify con CSS aislado por namespace. `publicar.py` sube el artículo por Admin API y `img.sh` prepara las capturas | Python, solo stdlib |
| [google-ads-cli/](google-ads-cli/) | Crear una campaña de **Search completa y atómica** por API (presupuesto, campaña pausada, geo, idioma, negativas, grupos, keywords, RSA) desde un JSON. Nace pausada: nada gasta hasta que la actives | Node + `google-ads-api` |
| [discovery-brief/](discovery-brief/) | Formulario público de discovery para un e-commerce: preguntas tipadas, PDF generado en el navegador y envío por Resend | Next.js + Tailwind + Resend |
| [lead-tracking-webhook/](lead-tracking-webhook/) | Tracking dual de un formulario de leads (Brevo) en un sitio Webflow: lado cliente (dataLayer, Pixel, conversión de Ads) y lado servidor (webhook de Brevo → Vercel → GA4 Measurement Protocol + Meta CAPI), deduplicados por `event_id`; atribución al primer contacto con `fbp`/`fbc`/`ga_client_id`; banner de consentimiento y registro de consentimiento; receta del Zap que convierte el lead en deal | Vercel Functions + Redis |

El design system de la agencia (brutalista, con tokens, assets, kit de componentes y el
playbook DOM→PPTX) está como skill en [`../skills/karma-creative-lab-design/`](../skills/karma-creative-lab-design/).
El kit de onboarding con el que un integrante nuevo deja su máquina igual a la mía en una hora
está en [`../claude/onboarding/`](../claude/onboarding/).

## Decisiones que se repiten en todas

- **Server-side para lo que cuenta dinero.** La compra y el lead se registran desde el servidor
  (webhook) con `event_id`; el navegador solo agrega señal. Si además instalas la app oficial
  de Meta o TikTok, esas mandan su propio CAPI y duplican.
- **Determinista primero, Claude después.** La aritmética (reparto de presupuesto, reglas de
  tier) la hace un motor testeable; Claude redacta encima con la voz de la agencia.
- **Un namespace por pieza inyectada.** Todo CSS que entra a Shopify o Webflow va bajo
  `.<ns>` para no pelear con el tema.
- **El artículo se regenera, no se edita.** Si hay que corregir una frase del blog, se edita
  el `.py` y se vuelve a publicar: preview y Shopify nunca se desincronizan.
- **Lo que se puede importar no se programa.** Google Ads toma `purchase` de GA4 por
  configuración, sin una línea de código.
