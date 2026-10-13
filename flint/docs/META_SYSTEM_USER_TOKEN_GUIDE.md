# Guía — Generar token de Meta Marketing API para el cliente

Documento para la administradora de el cliente. Objetivo: generar un **token no-expirable** de un System User para que un dashboard consultable pueda leer la data de campañas de el cliente en Meta Ads vía API oficial.

**Tiempo estimado:** 30–40 minutos.  
**Requisito:** Necesitas ser **Administradora** del Business Manager de el cliente (el que contiene la cuenta publicitaria `act_<ID>`).

---

## Por qué necesitamos esto

Estoy armando un dashboard consultable de las campañas de el cliente en **todos los medios** (Meta Ads, Google Ads, TikTok Ads). Para que el dashboard pueda mostrar la data de Meta actualizada cada hora, sin tener que descargar reportes manualmente, necesita un token de acceso con permiso de **solo lectura** sobre la cuenta publicitaria.

**Dos formas de generar un token:**

| | User Token | System User Token ✓ |
|---|---|---|
| Quién lo genera | Persona real | Usuario "de sistema" |
| Expira | Cada 60 días | **Nunca** |
| Si la persona deja la empresa | Token muere | Token sobrevive |
| Uso recomendado | Pruebas | **Producción** |

Vamos por la opción **System User Token** porque es la profesional — se configura una vez y no hay que tocarla de nuevo.

---

## Panorama general

Vamos a hacer 7 pasos:

1. Confirmar que eres Admin del Business Manager
2. Crear una cuenta de desarrolladora en developers.facebook.com
3. Crear una **App de Business** en Meta for Developers
4. Agregar el producto **Marketing API** a la app
5. Crear un **System User** en el Business Manager
6. Asignar la cuenta publicitaria al System User
7. Generar el **access token** no-expirable

Al final, solo tienes que mandarnos el token (un string largo que empieza con `EAA...`).

---

## Paso 1 — Confirma que eres Admin del Business Manager

1. Entra a https://business.facebook.com
2. Arriba a la izquierda, elige **el cliente** en el selector de empresas (si tienes acceso a varias)
3. Click en el engranito ⚙ (Business Settings / Configuración)
4. En el menú izquierdo: **Users → People** (Usuarios → Personas)
5. Busca tu nombre en la lista. **Tu rol debe ser "Admin"** — no "Employee" ni "Finance Editor"

**Si NO eres Admin:**
- Avísale a quien sí sea admin de el cliente para que te dé el rol, o para que haga este proceso y te dé el token al final
- Sin rol de Admin no vas a poder crear System Users ni generar tokens

**Si SÍ eres Admin:** continúa.

---

## Paso 2 — Cuenta de Meta for Developers

Esta es una cuenta **gratuita** que se crea con tu Facebook personal. Te permite acceder al portal de desarrolladores de Meta. No afecta nada de tu perfil de FB personal.

1. Abre https://developers.facebook.com
2. Arriba a la derecha: **Get Started** (o **Log In** si ya tienes cuenta)
3. Te va a pedir loguearte con **tu Facebook personal** → loguéate
4. Si es tu primera vez: acepta los términos de "Meta Platform Policy" y "Terms of Service"
5. Te va a preguntar **"What describes you?"** → selecciona **Developer**
6. Te va a preguntar un número de teléfono para verificar → introduce el tuyo, recibe código SMS, confirma

Cuando termines debes ver el **Developer Dashboard** (un tablero con la opción "Create App" arriba a la derecha).

---

## Paso 3 — Crear la App de Business

1. En el Developer Dashboard → **My Apps** (arriba) → **Create App**
2. Pantalla **"Select an app type"** → elige **Business**
3. Pantalla **"Details"**:
   - **App name:** `el cliente Dashboard API` (puedes llamarle como quieras, pero algo descriptivo ayuda)
   - **App contact email:** tu correo
   - **Business Account:** **⚠️ importante** → selecciona **el cliente** del dropdown (el Business Manager de el cliente)
4. Click **Create App**
5. Te pide verificación adicional (captcha o password de FB)

Debes llegar al **App Dashboard** de la nueva app. En la URL verás algo como `https://developers.facebook.com/apps/1234567890123456/dashboard`.

**Anota el App ID** (el número que aparece en la URL o arriba en el dashboard). No lo necesitamos para el token pero es útil como referencia.

---

## Paso 4 — Agregar el producto Marketing API

La app recién creada no tiene productos habilitados todavía. Hay que agregar **Marketing API**.

1. En el App Dashboard → menú izquierdo → **Add Products** (o scrollea abajo, hay una tarjeta de "Add products to your app")
2. Busca **Marketing API** → click en **Set Up** (botón en la tarjeta)
3. Te lleva a una configuración — **no necesitas cambiar nada**, solo confirma que Marketing API ya aparece en la barra lateral izquierda bajo "Products"

No requiere aprobación ni App Review para lo que necesitamos (solo leer data de tus propias cuentas).

---

## Paso 5 — Crear un System User en el Business Manager

Ahora regresamos al Business Manager (no al developer portal). El System User es un "usuario virtual" que vive dentro de tu BM y que solo existe para autenticarse contra APIs. No es una persona.

1. Abre https://business.facebook.com → elige el cliente
2. Engranito ⚙ → **Business Settings**
3. Menú izquierdo → **Users → System Users**
4. Arriba a la derecha: **Add** (botón azul)
5. En el popup:
   - **System User Name:** `Dashboard API User` (o similar — descriptivo)
   - **System User Role:** **Admin**
6. Click **Create System User**
7. Te va a pedir confirmar con password de FB → confirma

Cuando termine verás el nuevo System User en la lista con el rol Admin.

---

## Paso 6 — Asignar la cuenta publicitaria al System User

El System User acaba de nacer y no tiene acceso a nada todavía. Hay que darle permiso sobre la cuenta publicitaria de el cliente.

### 6a — Desde el panel del System User

1. Todavía en **Business Settings → Users → System Users**
2. Click en el System User que acabas de crear (`Dashboard API User`)
3. En el panel de la derecha: **Add Assets** (Agregar activos)
4. En el popup selecciona **Ad Accounts**
5. En la lista que aparece, marca la cuenta publicitaria de **el cliente** (la que tiene los anuncios, ID `act_<ID>`)
6. En la columna derecha, activa estos permisos:
   - ✅ **Manage campaigns** (o "Administrar campañas")
   - ✅ **View performance** (o "Ver rendimiento")
7. Click **Save Changes**

---

## Paso 7 — Generar el Access Token

Este es el paso final. Vas a generar el token que va a usar el dashboard.

1. En el panel del System User (mismo lugar del paso anterior)
2. Click **Generate New Token**
3. En el popup:
   - **App:** selecciona la app que creaste en el Paso 3 (`el cliente Dashboard API`)
   - **Token Expiration:** **Never**
   - **Available Permissions:** activa estos 3 checkboxes:
     - ✅ `ads_read`
     - ✅ `ads_management`
     - ✅ `business_management`
4. Click **Generate Token**
5. Meta muestra el token **una sola vez** — es un string largo que empieza con `EAA...` (unos 200 caracteres)
6. **Cópialo inmediatamente** — si cierras el popup sin copiarlo, tienes que volver a generar otro (no lo vuelve a mostrar)

---

## Qué hacer con el token

**Mándamelo por un canal seguro:**
- WhatsApp directo (no grupal)
- Correo cifrado
- **NO** lo pegues en un documento compartido, Slack público, ni ticket

El token da acceso de **solo-lectura** a la data de campañas de el cliente. No permite crear, pausar, ni modificar anuncios — solo leerlos — porque así lo configuré en el dashboard. Pero igual trátalo como una contraseña.

---

## Verificación rápida (opcional pero recomendada)

Si quieres confirmar que el token funciona **antes** de mandármelo:

1. Abre https://developers.facebook.com/tools/debug/accesstoken/
2. Pega el token en el campo → click **Debug**
3. Confirma que muestra:
   - **App:** `el cliente Dashboard API` (el que creaste)
   - **User:** `Dashboard API User` (el System User)
   - **Scopes:** `ads_read, ads_management, business_management`
   - **Expires:** **Never**
   - **Is Valid:** **Yes**

Si cualquiera de esos campos está mal, regresa al Paso 7 y regenera.

---

## Problemas comunes

### "No puedo crear el System User — el botón está gris"
No eres Admin del Business Manager. Regresa al Paso 1.

### "Al generar el token no me sale la opción de permisos"
Probablemente olvidaste el Paso 4 (agregar Marketing API a la app). Regresa ahí.

### "No aparece la cuenta publicitaria de el cliente cuando intento asignarla"
La cuenta publicitaria no está dentro del Business Manager. Tienes que **Claim** la cuenta primero:
- Business Settings → Accounts → Ad Accounts → **Add → Claim an Ad Account**
- Introduce el ID de la cuenta (`act_<ID>`) y confirma la propiedad

### "Dice que la App necesita App Review para usar Marketing API"
Esto aplica solo si pides permisos avanzados (crear anuncios, etc.). Los 3 permisos que pide esta guía (`ads_read`, `ads_management`, `business_management`) **no requieren App Review** cuando se usan con un System User asignado a cuentas propias del Business Manager. Si te dice que sí, avísame.

### "¿Por qué no usamos simplemente mi token personal?"
Tu token personal expira cada 60 días y tendrías que regenerarlo continuamente. El System User token es no-expirable y sobrevive si tú ya no trabajas en el cliente. Es la forma correcta para producción.

---

## Qué va a hacer el dashboard con este token

Una vez configurado:

- **Cada hora**, el dashboard le pregunta al API de Meta: "¿qué pasó con las campañas de el cliente en el mes actual?"
- Meta responde con el gasto por campaña, impresiones, clicks, conversiones, etc.
- El dashboard guarda ese snapshot y muestra la data actualizada sin intervención manual
- Se consolida junto a Google Ads y TikTok en una sola vista consultable de el cliente en todos los medios

**El dashboard NO hace:**
- Crear, pausar, ni modificar anuncios
- Cambiar presupuestos
- Tocar la estructura de la cuenta
- Acceder a datos de audiencias o tracking de usuarios

Es solo **lectura**. Si quieres hacer cambios en la cuenta, sigues usando Ads Manager como siempre.

---

## ¿Dudas?

Contáctame directamente con screenshots de la pantalla donde te atores. Esta guía cubre el 95% de los casos pero a veces Meta cambia la UI y hay que ajustar.
