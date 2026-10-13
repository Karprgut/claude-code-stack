# Zap "TBP Studio" — Recipe de reescritura (post-migración CATEGORY)

> Fecha: 2026-05-08
> Reemplaza la lógica antigua basada en `SERVICES` / `STIMATED_BUDGET` / `PROJECT_STAGE` por el atributo único `CATEGORY` de Brevo.
> Zap actual a editar: **TBP Studio** (id `360152739`, ON, cuenta `27106629`).

## Decisiones tomadas (2026-05-08)

- Stage equivalente a "New lead" → `First Contact` en cada pipeline.
- CATEGORY 4 (Brand Applications) → pipeline **TBP - Sprint** (no tiene pipeline propio).
- Form en Brevo guarda contactos en lista `TBP - forms` (id 17). Confirmado.

## Estructura del Zap

### 1. Trigger
- **App:** Brevo
- **Event:** New Contact in List
- **List:** `TBP - forms` (id `17`)

### 2. Path by Zapier (4 paths)

Filtros: usar **Text Exactly Matches** sobre el campo `CATEGORY` del trigger. Brevo serializa CATEGORY como string.

#### Path A — CATEGORY = `1` (Sprint)
- **Filter:** CATEGORY Exactly Matches `1`
- **Step 2 — Gmail: Send Email**
  - To: `persona@cliente.com, contacto@cliente.com`
  - From: (cuenta TBP autorizada)
  - Subject: `Nuevo lead Sprint: {{NOMBRE}}`
  - Body: ver plantilla más abajo (owner = "Javier", category = "Sprint")
- **Step 3 — Webhooks by Zapier: POST** *(crear deal en CRM)*
  - URL: `https://api.brevo.com/v3/crm/deals`
  - Method: `POST`
  - Headers:
    - `api-key`: `xkeysib-<TU_API_KEY_DE_BREVO>`
    - `content-type`: `application/json`
  - Payload type: `Json`
  - Body:
    ```json
    {
      "name": "{{NOMBRE}} {{APELLIDOS}} – Sprint",
      "attributes": {
        "deal_owner": "<ID>",
        "pipeline": "<ID>",
        "deal_stage": "<ID>a4e4da3a",
        "category": "sprint",
        "deal_description": "{{TELL_US_ABOUT}}"
      },
      "linkedContactsIds": [{{contact_id}}]
    }
    ```

#### Path B — CATEGORY = `2` (Core)
- **Filter:** CATEGORY Exactly Matches `2`
- **Gmail:** to `persona@cliente.com, contacto@cliente.com` · subject `Nuevo lead Core: {{NOMBRE}}`
- **Webhook deal:**
    ```json
    {
      "name": "{{NOMBRE}} {{APELLIDOS}} – Core",
      "attributes": {
        "deal_owner": "<ID>",
        "pipeline": "<ID>",
        "deal_stage": "<ID>634ea5f4",
        "category": "core",
        "deal_description": "{{TELL_US_ABOUT}}"
      },
      "linkedContactsIds": [{{contact_id}}]
    }
    ```

#### Path C — CATEGORY = `3` (Deep)
- **Filter:** CATEGORY Exactly Matches `3`
- **Gmail:** to `contacto@cliente.com` · subject `Nuevo lead Deep: {{NOMBRE}}`
- **Webhook deal:**
    ```json
    {
      "name": "{{NOMBRE}} {{APELLIDOS}} – Deep",
      "attributes": {
        "deal_owner": "<ID>",
        "pipeline": "<ID>",
        "deal_stage": "3dded92c-26ab-4120-87a5-2e859ee681b0",
        "category": "deep",
        "deal_description": "{{TELL_US_ABOUT}}"
      },
      "linkedContactsIds": [{{contact_id}}]
    }
    ```

#### Path D — CATEGORY = `4` (Brand Applications)
- **Filter:** CATEGORY Exactly Matches `4`
- **Gmail:** to `persona@cliente.com, contacto@cliente.com` · subject `Nuevo lead Brand Applications: {{NOMBRE}}`
- **Webhook deal:** (apunta a Sprint pipeline, decisión 2026-05-08)
    ```json
    {
      "name": "{{NOMBRE}} {{APELLIDOS}} – Brand Applications",
      "attributes": {
        "deal_owner": "<ID>",
        "pipeline": "<ID>",
        "deal_stage": "<ID>a4e4da3a",
        "category": "brand_applications",
        "deal_description": "{{TELL_US_ABOUT}}"
      },
      "linkedContactsIds": [{{contact_id}}]
    }
    ```

## Campos custom del deal

A partir de 2026-05-11 cada deal creado guarda dos campos extra que vienen del form:

| Campo deal | Tipo | Source |
|---|---|---|
| `category` | single-select (`sprint`/`core`/`deep`/`brand_applications`) | Hardcoded por path en el payload |
| `deal_description` | text | `{{TELL_US_ABOUT}}` del trigger Brevo (textarea "We'd love to hear about your project") |

`category` es atributo custom (id `<ID>`). `deal_description` es atributo system de Brevo, se renderiza como "Description" en la UI del CRM.

## Plantilla de email (Gmail step)

```
Subject: Nuevo lead {{CATEGORY_LABEL}}: {{NOMBRE}}

Hola {{OWNER_NAME}},

Tienes un nuevo lead categorizado como {{CATEGORY_LABEL}}.

Nombre:    {{NOMBRE}} {{APELLIDOS}}
Email:     {{EMAIL}}
WhatsApp:  {{SMS}}
Empresa:   {{BUSINESS_NAME}}
Industria: {{INDUSTRIA}}
Región:    {{WHERE_ARE_YOU_BASED}}

Proyecto:
{{TELL_US_ABOUT}}

Atribución:
- Campaign: {{CAMPAIGN_NAME}}  (id {{CAMPAIGN_ID}})
- Adset:    {{ADSET_NAME}}     (id {{ADSET_ID}})
- Ad:       {{AD_NAME}}
- Form:     {{FORM_ID}}

—
Brevo contact: https://app.brevo.com/contact/{{contact_id}}
```

Sustituir `{{CATEGORY_LABEL}}` y `{{OWNER_NAME}}` literal por path:
| Path | CATEGORY_LABEL | OWNER_NAME |
|---|---|---|
| A | Sprint | Javier |
| B | Core | Karla |
| C | Deep | Hello |
| D | Brand Applications | Javier |

## Por qué Webhooks y no la action nativa "Add or Update Deal" de Brevo
La action nativa (`dealAddOrUpdate`) **no acepta especificar `pipeline` ni `deal_stage`** desde Zapier (campos no expuestos en el form). Para garantizar que el deal cae en TBP-Sprint/Core/Deep en stage "First Contact" hay que usar la API REST directa.

## Tracking — recordatorio
NO agregar steps de GA4 ni Meta CAPI en este Zap. El webhook server-side en Vercel (`api/brevo-webhook.js`) ya dispara conversion events con dedup. Zapier solo hace routing comercial.

## Test plan (después de activar)

1. Submit form de prueba con CATEGORY=1 → email a Javier+Hello, deal en TBP-Sprint/First Contact.
2. CATEGORY=2 → email a Karla+Hello, deal en TBP-Core/First Contact.
3. CATEGORY=3 → email a Hello, deal en TBP-Deep/First Contact.
4. CATEGORY=4 → email a Javier+Hello, deal en TBP-Sprint/First Contact.
5. Verificar contacto sigue en lista 17 (TBP - forms).

## Pendientes UI (no automatizables vía MCP)

- [x] Renombrar pipeline `TBP - Spint` → `TBP - Sprint` (hecho 2026-05-08).
- [x] Renombrar stage `Firtst Contact` → `First Contact` en TBP - Deep (hecho 2026-05-08).
- [ ] *(opcional)* Renombrar stage `Negociacio` → `Negociacion` en TBP - Deep (queda inconsistente con Sprint/Core).
- [ ] Apagar Zap viejo o reescribirlo en sitio.

## IDs de referencia rápidos

```
Pipelines:
  TBP - Sprint:                  <ID>
    └─ First Contact:            <ID>a4e4da3a
  TBP - Core:                    <ID>
    └─ First Contact:            <ID>634ea5f4
  TBP - Deep:                    <ID>
    └─ First Contact:            3dded92c-26ab-4120-87a5-2e859ee681b0

Listas Brevo:
  7  TBP Studio
  8  Form - Platform
  13 Meta Leads
  17 TBP - forms          ← trigger del Zap

Owners (deal_owner = user_id hex de Brevo CRM):
  Javier (persona@cliente.com):  <ID>
  Karla  (persona@cliente.com):   <ID>
  Hello  (contacto@cliente.com):     <ID>
```

---

## Adenda 2026-10-01 · formulario propio del check-out v5

El formulario de Brevo dejó de usarse en `/proyectos/<tier>`. Ahora el contacto lo crea
`api/lead.js` por API, en la misma lista 17 y con el mismo `CATEGORY`, así que **el Zap no
necesita cambios estructurales**: sigue disparando con "New Contact in List 17" y ruteando igual.

Dos ajustes de contenido:

### 1. El teléfono (ya resuelto del lado del endpoint)

La plantilla del correo lee `{{SMS}}`, que es donde el formulario viejo guardaba el teléfono.
El check-out nuevo pide "WhatsApp number" y lo natural era escribirlo en `WHATSAPP` — pero
entonces el correo llegaba sin teléfono. `api/lead.js` ahora escribe **los dos atributos** con el
mismo valor. No hay que tocar el Zap.

### 2. Los extras (PENDIENTE — hay que editar el Zap)

El check-out agrega dos casillas que no existían: Naming Strategy y Applications / Collaterals.
Se guardan en los atributos `EXTRA_NAMING` y `EXTRA_APPLICATIONS` (boolean, creados 30-sep-2026),
pero **la plantilla del correo no los incluye**, así que el owner no los ve.

Agregar al cuerpo del Gmail de **los cuatro paths**:

```
Extras solicitados
Naming Strategy:             {{EXTRA_NAMING}}
Applications / Collaterals:  {{EXTRA_APPLICATIONS}}
```

Y, si se quiere que queden en el CRM, al `deal_description` del webhook del deal:

```
{{TELL_US_ABOUT}} — Naming: {{EXTRA_NAMING}} · Applications: {{EXTRA_APPLICATIONS}}
```

**Gotcha de Zapier:** los atributos nuevos no aparecen en el selector de campos hasta que se
vuelve a jalar una muestra del trigger ("Test trigger" / refrescar el sample). El contacto
`test1tu-cuenta@tu-dominio.com` (1-oct-2026) ya trae los dos campos llenos y sirve de muestra.

---

## Adenda 2026-10-05 · el Zap tronaba con los leads que escriben en párrafos

### El bug

El step de `Webhooks by Zapier → POST` arma el body como **JSON crudo** y Zapier interpola
`{{TELL_US_ABOUT}}` **sin escaparlo**. Un salto de línea es un carácter de control dentro de un
string JSON: lo invalida, Brevo contesta 400 y **el deal nunca se crea**. Como el Gmail es el step
anterior, **el owner sí recibe el correo** — por eso el fallo pasó meses desapercibido.

Reproducido con el lead de Selene (5-oct):
`Invalid control character at: line 8 column 145`.

Correlación contra la lista 17 (ventana jun–oct 2026, donde hay deals para comparar): **5 de 5**
contactos con saltos de línea se quedaron sin deal — Selene (5-oct), Cristina Sava (3-oct),
fx.girou (11-ago), estefania.gaab (28-jul), owais (22-jul). Todos los de texto en una sola línea
tienen su deal. Dos misses que **no** explica esto: natalia@crs.legal (10-sep) y jimecs13 (3-jul).

Una comilla doble o un backslash en el texto rompen exactamente igual.

### Mitigación aplicada (lado servidor, sin tocar el Zap)

`api/lead.js` ahora pasa `NOMBRE`, `APELLIDOS` y `TELL_US_ABOUT` por `jsonSafe()` antes de
escribirlos en Brevo: los párrafos se vuelven ` · `, los saltos/tabs/control chars se colapsan a
espacio, `"` → `'` y `\` → `/`. Verificado contra los 8 contactos históricos cuyo texto rompía el
JSON: los 8 ya producen un body válido.

**Limitación:** esto solo cubre lo que entra por `api/lead.js`. Si algún día vuelve a entrar algo
más a la lista 17 (p. ej. el form instantáneo de Meta), el Zap vuelve a ser vulnerable.

### Arreglo definitivo (PENDIENTE — solo se puede en la UI de Zapier)

Sustituir el step de Webhooks por un **Code by Zapier (JavaScript)** en **los cuatro paths**, que
serializa de verdad. Input data del step: `nombre`, `apellidos`, `about`, `contact_id`.

```js
const payload = {
  name: `${inputData.nombre || ''} ${inputData.apellidos || ''}`.trim() + ' - Sprint',
  attributes: {
    deal_owner:  '<ID>',
    pipeline:    '<ID>',
    deal_stage:  '<ID>a4e4da3a',
    category:    'sprint',
    deal_description: inputData.about || ''
  },
  linkedContactsIds: [Number(inputData.contact_id)]
};
const r = await fetch('https://api.brevo.com/v3/crm/deals', {
  method: 'POST',
  headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json' },
  body: JSON.stringify(payload)          // ← esto es lo que el JSON crudo no hacía
});
if (!r.ok) throw new Error(`Brevo ${r.status}: ${await r.text()}`);
output = [{ ok: true }];
```

Cambiar `name`, `deal_owner`, `pipeline`, `deal_stage` y `category` por path (tabla de IDs abajo).

### Correcciones al recipe (lo de arriba quedó viejo)

- **Path D ya NO apunta a Sprint.** Existe un pipeline propio **Brand Applications**
  `<ID>`, stage First Contact `<ID>0f94ffcc`
  (ojo: en Brevo se llama literal `Firtst Contact`, con el typo). Ahí cayó el deal de Elizabeth.
- **El separador del nombre es un guion normal**, no el `–` de este doc: los deals reales se llaman
  `Lucila Escobedo Olin - Core`.
- El `deal_stage` de **TBP - Deep** sí lleva guiones (`3dded92c-26ab-4120-87a5-2e859ee681b0`).
  No es un error de captura: Brevo devuelve esos IDs en formato UUID solo para ese pipeline.

### Lo que sigue pendiente en la UI de Zapier

- [ ] Code step en los 4 paths (arriba).
- [ ] Agregar `EXTRA_NAMING` / `EXTRA_APPLICATIONS` al cuerpo del Gmail de los 4 paths
      (pendiente desde la adenda del 1-oct). Requiere refrescar la muestra del trigger primero.
- [ ] Revisar por qué natalia@crs.legal (10-sep, único Deep de la ventana) no generó deal.
