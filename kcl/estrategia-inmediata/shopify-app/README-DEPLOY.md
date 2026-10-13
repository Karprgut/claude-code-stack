# Handoff post-pago de la Estrategia — guía de deploy

Cierra el hueco: después de pagar la estrategia, el cliente ya no se queda sin
confirmación. Dos piezas, independientes entre sí:

1. **Email** (red de seguridad, sirve siempre) — el backend manda el entregable
   por correo en cuanto se genera.
2. **Extensión de la página de "Gracias"** (confirmación en pantalla) — muestra
   "Estamos generando tu estrategia…" y luego el botón **VER MI ESTRATEGIA →**.

---

## 0. Deploy del backend (obligatorio para las dos piezas)

Ya está en el código:
- `/api/strategy/status` ahora responde **CORS `*`** (lo necesita el polling de
  la extensión, que corre en un sandbox de Shopify).
- El wizard guarda el `submissionId` también como **cart attribute** (lo lee la
  extensión).

Para publicarlo:

```bash
# Backend (Vercel) — desde el worktree karma-backend, rama main
cd "karma-backend"
git add -A && git commit -m "handoff post-pago: CORS publico en status"
git push origin main        # GitHub → Vercel construye y despliega (~3 min)

# Theme (cart attribute en el wizard) — rama shopify-theme
cd "../karma-theme"
git add -A && git commit -m "wizard: submissionId como cart attribute"
git push origin shopify-theme   # push = deploy al theme live
```

---

## 1. Email con el entregable (Resend) — YA LISTO ✅

Nada que hacer. `karma-backend/lib/strategy/email.ts` está activo con Resend
(`RESEND_API_KEY` + `RESEND_FROM = Karma Creative Lab <tu-cuenta@tu-dominio.com>`
ya en Vercel, dominio verificado). El cliente ya recibe el entregable por correo
cuando se genera. La extensión de abajo solo agrega la confirmación EN PANTALLA.

---

## 2. Extensión de la página de "Gracias"

> Requiere tu login de **Shopify Partners** (se abre el navegador). El CLI ya
> está instalado (`shopify` 3.88). Tu tienda usa *checkout extensibility*, por
> eso esto va como extensión y no como "Additional scripts".

El código de la extensión ya está en `extensions/estrategia-thankyou/`
(`src/Checkout.jsx` + `shopify.extension.toml`). Para publicarla:

```bash
cd "karma-shopify-app"

# Vincula esta carpeta a una app de Partners (crea una nueva si hace falta).
# Escribe shopify.app.toml con el client_id.
shopify app config link

# Sube la extensión a Shopify.
shopify app deploy
```

Si `shopify app config link` se queja de que falta estructura de app, la ruta
100% segura es regenerar el andamiaje y copiar los 2 archivos:

```bash
shopify app init            # crea la app base (elige "Build an extension-only app" si aparece)
cd <carpeta-que-creo>
shopify app generate extension   # elige: Checkout UI → "Thank you" page
# luego copia encima:
#   src/Checkout.jsx           ← de extensions/estrategia-thankyou/src/Checkout.jsx
#   shopify.extension.toml     ← añade el target y "network_access = true"
shopify app deploy
```

### Instalar la app en la tienda

Tras `shopify app deploy`, la app vive en Partners pero hay que instalarla en
`karma-creative-lab.myshopify.com`:

- Partners → tu app → **Test your app / Select store** → instalar en la tienda, o
- corre `shopify app dev` una vez y abre el link de instalación que imprime.

### Activar el bloque en la página de Gracias

Una vez deployada e instalada la app en la tienda:

1. Shopify admin → **Settings → Checkout**.
2. En **Thank you and order status pages** (o "Configuración de checkout") →
   **Customize**.
3. En el editor, selecciona la página **Thank you** → **Add app block** →
   elige **Estrategia — Gracias** → colócalo donde quieras (arriba del resumen).
4. **Save**.

---

## 3. Probar (e2e)

1. Entra a https://karmacreativelab.com/pages/estrategia
2. Llena el wizard → **OBTENER MI ESTRATEGIA** → paga (modo prueba de Shopify o
   pedido real + reembolso).
3. En la página de **Gracias** debe verse "Estamos generando tu estrategia…" y,
   en ~1 min, el botón **VER MI ESTRATEGIA →**.
4. Debe llegar el **correo** con el entregable.

Si el botón no aparece pero el correo sí llega: revisa que el bloque esté
activado (paso 2) y que `submissionId` viaje (Order → Additional details /
note attributes debe mostrarlo).
