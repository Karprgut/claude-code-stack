# Plantilla de email TBP — Zap router (con condicionales)

> Para el step **Gmail: Send Email** del Zap "TBP Studio".
> Usa estilo TBP: electric blue `#003DFF`, ink `#000000`, hairlines sutiles, sans-serif limpio.
> El HTML se construye con un **Code by Zapier** step para que campos vacíos no aparezcan.

---

## Arquitectura del Zap (recomendada)

Zapier no soporta `if/else` en merge tags, así que metemos un **Code by Zapier** step que arma el HTML condicional, los recipients, el subject, los IDs del CRM, y los payloads JSON listos para los webhooks. Después Gmail y los Webhooks solo consumen los outputs.

```
1. Brevo: New Contact in List 17 (TBP - forms)
2. Code by Zapier (Run Javascript)         ← arma todo (HTML + payloads JSON)
3. Gmail: Send Email
4. Webhook POST → crear deal en Brevo CRM (con amount según CATEGORY)
5. Webhook POST → actualizar contacto con BUDGET_HINT
```

> **Tip:** ya no se necesitan Paths. El Code step pre-computa todo por categoría. Si igual quieres Paths para observabilidad en run history, mete los 4 Filters después del Code step (cada uno apuntando a `{{step_2.category_label}}` o el CATEGORY raw).

---

## Step 2 — Code by Zapier (Run Javascript)

### Input Data (mapear desde el Brevo trigger)

| Key (Code step) | Value (merge tag del trigger) |
|---|---|
| CATEGORY | `{{CATEGORY}}` |
| NOMBRE | `{{NOMBRE}}` |
| APELLIDOS | `{{APELLIDOS}}` |
| EMAIL | `{{EMAIL}}` |
| SMS | `{{SMS}}` |
| BUSINESS_NAME | `{{BUSINESS_NAME}}` |
| INDUSTRIA | `{{INDUSTRIA}}` |
| WHERE_ARE_YOU_BASED | `{{WHERE_ARE_YOU_BASED}}` |
| TELL_US_ABOUT | `{{TELL_US_ABOUT}}` |
| CAMPAIGN_NAME | `{{CAMPAIGN_NAME}}` |
| CAMPAIGN_ID | `{{CAMPAIGN_ID}}` |
| ADSET_NAME | `{{ADSET_NAME}}` |
| ADSET_ID | `{{ADSET_ID}}` |
| AD_NAME | `{{AD_NAME}}` |
| FORM_ID | `{{FORM_ID}}` |
| contact_id | `{{contact_id}}` (o el campo `id` que el trigger exponga) |

### Code (pegar tal cual)

```javascript
const has = v => {
  if (v === null || v === undefined) return false;
  const s = String(v).trim().toLowerCase();
  return s !== '' && s !== 'null' && s !== 'undefined' && s !== 'none';
};
const safe = v => has(v) ? String(v).trim() : '';

const CATEGORY = String(inputData.CATEGORY || '').trim();
const CATEGORY_MAP = {
  '1': { label: 'Sprint',             owner: 'Javier', to: 'persona@cliente.com, contacto@cliente.com', pipeline: '69fe1f9b9d6795cc1ee889a7', stage: 'd960e141bbd040018dbf8bd5a4e4da3a', dealOwner: '69fe6086562cf522f7066007', amount: 3500,  budgetHint: '$3,500+ USD' },
  '2': { label: 'Core',               owner: 'Karla',  to: 'persona@cliente.com, contacto@cliente.com',  pipeline: '69fe1f5d9d6795cc1ee88969',  stage: 'cb851b8e0acf41f2a2e1e115634ea5f4', dealOwner: '69fa73481576c0465f0f7f7e',                  amount: 8000,  budgetHint: '$8,000+ USD' },
  '3': { label: 'Deep',               owner: 'Hello',  to: 'contacto@cliente.com',                       pipeline: '69c3090e7005e09e865f96b0',  stage: '3dded92c-26ab-4120-87a5-2e859ee681b0', dealOwner: '69c308e89f467fa1780e8641',                  amount: 20000, budgetHint: '$20,000+ USD' },
  '4': { label: 'Brand Applications', owner: 'Javier', to: 'persona@cliente.com, contacto@cliente.com', pipeline: '69fe1f9b9d6795cc1ee889a7', stage: 'd960e141bbd040018dbf8bd5a4e4da3a', dealOwner: '69fe6086562cf522f7066007', amount: null,  budgetHint: 'Custom' },
};
const cat = CATEGORY_MAP[CATEGORY] || { label: 'Sin categoría', owner: 'Equipo', to: 'contacto@cliente.com', pipeline: '', stage: '', dealOwner: '', amount: null, budgetHint: '' };

const NOMBRE      = safe(inputData.NOMBRE);
const APELLIDOS   = safe(inputData.APELLIDOS);
const EMAIL       = safe(inputData.EMAIL);
const SMS         = safe(inputData.SMS);
const BUSINESS    = safe(inputData.BUSINESS_NAME);
const INDUSTRIA   = safe(inputData.INDUSTRIA);
const REGION      = safe(inputData.WHERE_ARE_YOU_BASED);
const PROYECTO    = safe(inputData.TELL_US_ABOUT);
const CAMP_NAME   = safe(inputData.CAMPAIGN_NAME);
const CAMP_ID     = safe(inputData.CAMPAIGN_ID);
const ADSET_NAME  = safe(inputData.ADSET_NAME);
const ADSET_ID    = safe(inputData.ADSET_ID);
const AD_NAME     = safe(inputData.AD_NAME);
const FORM_ID     = safe(inputData.FORM_ID);
const CONTACT_ID  = safe(inputData.contact_id);

const fullName = [NOMBRE, APELLIDOS].filter(Boolean).join(' ') || 'Lead sin nombre';

const row = (label, value) => value
  ? `<tr><td width="110" style="color:#5C5C5C;padding:4px 0;">${label}</td><td style="padding:4px 0;">${value}</td></tr>`
  : '';

const rowEmail = EMAIL
  ? `<tr><td width="110" style="color:#5C5C5C;padding:4px 0;">Email</td><td style="padding:4px 0;"><a href="mailto:${EMAIL}" style="color:#003DFF;text-decoration:none;">${EMAIL}</a></td></tr>`
  : '';

const contactRows = [
  rowEmail,
  row('WhatsApp', SMS),
  row('Empresa',  BUSINESS),
  row('Industria', INDUSTRIA),
  row('Región',   REGION),
].join('');

const contactSection = contactRows
  ? `<tr><td style="padding:0 28px;"><div style="border-top:1px solid rgba(0,0,0,0.18);height:1px;line-height:1px;font-size:1px;">&nbsp;</div></td></tr>
<tr><td style="padding:24px 28px 8px 28px;">
  <p style="margin:0 0 12px 0;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:#5C5C5C;font-weight:700;">Contacto</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;line-height:1.6;color:#000000;">${contactRows}</table>
</td></tr>` : '';

const projectSection = PROYECTO
  ? `<tr><td style="padding:24px 28px 0 28px;"><div style="border-top:1px solid rgba(0,0,0,0.18);height:1px;line-height:1px;font-size:1px;">&nbsp;</div></td></tr>
<tr><td style="padding:24px 28px 8px 28px;">
  <p style="margin:0 0 12px 0;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:#5C5C5C;font-weight:700;">El proyecto</p>
  <p style="margin:0;font-size:15px;line-height:1.6;color:#000000;white-space:pre-wrap;">${PROYECTO}</p>
</td></tr>` : '';

const attrRows = [
  (CAMP_NAME || CAMP_ID) ? `<tr><td width="110" style="color:#5C5C5C;padding:3px 0;">Campaign</td><td style="padding:3px 0;">${CAMP_NAME}${CAMP_ID ? ` <span style="color:#B7B2A7;">· ${CAMP_ID}</span>` : ''}</td></tr>` : '',
  (ADSET_NAME || ADSET_ID) ? `<tr><td width="110" style="color:#5C5C5C;padding:3px 0;">Adset</td><td style="padding:3px 0;">${ADSET_NAME}${ADSET_ID ? ` <span style="color:#B7B2A7;">· ${ADSET_ID}</span>` : ''}</td></tr>` : '',
  AD_NAME  ? `<tr><td width="110" style="color:#5C5C5C;padding:3px 0;">Ad</td><td style="padding:3px 0;">${AD_NAME}</td></tr>`     : '',
  FORM_ID  ? `<tr><td width="110" style="color:#5C5C5C;padding:3px 0;">Form</td><td style="padding:3px 0;">${FORM_ID}</td></tr>` : '',
].join('');

const attrSection = attrRows
  ? `<tr><td style="padding:16px 28px 0 28px;"><div style="border-top:1px solid rgba(0,0,0,0.18);height:1px;line-height:1px;font-size:1px;">&nbsp;</div></td></tr>
<tr><td style="padding:24px 28px 8px 28px;">
  <p style="margin:0 0 12px 0;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:#5C5C5C;font-weight:700;">Atribución</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:13px;line-height:1.6;color:#000000;">${attrRows}</table>
</td></tr>` : '';

const ctaSection = CONTACT_ID
  ? `<tr><td style="padding:32px 28px 36px 28px;" align="left">
  <a href="https://app.brevo.com/contact/index/${CONTACT_ID}" style="display:inline-block;background:#003DFF;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;padding:14px 22px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Abrir contacto en Brevo →</a>
</td></tr>`
  : `<tr><td style="padding:0 0 24px 0;">&nbsp;</td></tr>`;

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nuevo lead ${cat.label}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f1;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#000000;-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f1;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#FFFFFF;border:1px solid rgba(0,0,0,0.18);">
<tr><td style="background:#003DFF;padding:14px 28px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#FFFFFF;font-weight:700;">TBP · Studio</td>
      <td align="right" style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#FFFFFF;font-weight:700;">New lead</td>
    </tr>
  </table>
</td></tr>
<tr><td style="padding:36px 28px 12px 28px;">
  <span style="display:inline-block;padding:5px 10px;border:1.5px solid #000000;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;font-weight:700;color:#000000;">${cat.label}</span>
</td></tr>
<tr><td style="padding:8px 28px 4px 28px;">
  <h1 style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:26px;line-height:1.15;font-weight:700;color:#000000;letter-spacing:-0.5px;">${fullName}</h1>
</td></tr>
<tr><td style="padding:0 28px 24px 28px;">
  <p style="margin:6px 0 0 0;font-size:14px;color:#5C5C5C;line-height:1.5;">Hola <strong style="color:#000000;">${cat.owner}</strong>, tienes un nuevo lead categorizado como <strong style="color:#003DFF;">${cat.label}</strong>.</p>
</td></tr>
${contactSection}
${projectSection}
${attrSection}
${ctaSection}
<tr><td style="background:#000000;padding:14px 28px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#B7B2A7;">Auto-routed · TBP CRM</td>
      <td align="right" style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#B7B2A7;">tu-sitio.com</td>
    </tr>
  </table>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

// Build deal payload — omit `amount` when null (Brand Apps)
const dealAttrs = {
  deal_owner: cat.dealOwner,
  pipeline:   cat.pipeline,
  deal_stage: cat.stage,
};
if (cat.amount !== null && cat.amount !== undefined) {
  dealAttrs.amount = cat.amount;
}
const dealBody = {
  name: `${fullName} – ${cat.label}`,
  attributes: dealAttrs,
  linkedContactsIds: CONTACT_ID ? [Number(CONTACT_ID)] : [],
};

// Build contact update payload (set BUDGET_HINT, upsert by email)
const contactBody = {
  email: EMAIL,
  attributes: { BUDGET_HINT: cat.budgetHint },
  updateEnabled: true,
};

output = {
  email_body_html:    html,
  subject:            `Nuevo lead ${cat.label} — ${fullName}`,
  recipients:         cat.to,
  category_label:     cat.label,
  owner_name:         cat.owner,
  pipeline_id:        cat.pipeline,
  deal_stage:         cat.stage,
  deal_owner:         cat.dealOwner,
  deal_name:          `${fullName} – ${cat.label}`,
  deal_amount:        cat.amount === null ? '' : cat.amount,
  budget_hint:        cat.budgetHint,
  deal_body_json:     JSON.stringify(dealBody),
  contact_body_json:  JSON.stringify(contactBody),
};
```

---

## Step 3 — Gmail: Send Email

| Campo | Valor |
|---|---|
| **From** | contacto@cliente.com (cuenta autorizada) |
| **To** | `{{step_2.recipients}}` |
| **Subject** | `{{step_2.subject}}` |
| **Body Type** | **HTML** ⚠️ |
| **Body** | `{{step_2.email_body_html}}` |

> Reemplaza `step_2` por el nombre real que Zapier le dé al Code step (ej. "Run Javascript in Code by Zapier").

---

## Step 4 — Webhooks by Zapier: POST (crear deal con `amount`)

| Campo | Valor |
|---|---|
| URL | `https://api.brevo.com/v3/crm/deals` |
| Method | `POST` |
| **Payload type** | **`Raw`** ⚠️ (no Json — el body ya viene serializado del Code step para que `amount` se omita en Brand Apps) |
| Data | `{{step_2.deal_body_json}}` |
| Headers | `api-key: xkeysib-<TU_API_KEY_DE_BREVO>` <br> `content-type: application/json` |

> **Por qué Raw:** Brevo rechaza `"amount": null` en algunas validaciones internas. El Code step omite el campo cuando es Brand Applications, así Brevo lo trata como deal sin monto. Si forzaras `Payload type: Json` en Zapier, no podrías condicionar la presencia del campo.

Amounts por categoría (resueltos en el Code step):

| CATEGORY | amount |
|---|---|
| 1 Sprint | `3500` |
| 2 Core | `8000` |
| 3 Deep | `20000` |
| 4 Brand Applications | *(omitido — sin monto)* |

---

## Step 5 — Webhooks by Zapier: POST (set `BUDGET_HINT` en contacto)

| Campo | Valor |
|---|---|
| URL | `https://api.brevo.com/v3/contacts` |
| Method | `POST` |
| Payload type | **`Raw`** |
| Data | `{{step_2.contact_body_json}}` |
| Headers | `api-key: xkeysib-<TU_API_KEY_DE_BREVO>` <br> `content-type: application/json` |

> Usa `POST /v3/contacts` con `updateEnabled: true` — funciona como upsert vía email. No necesita el `contact_id`, solo el email del trigger.

BUDGET_HINT por categoría:

| CATEGORY | BUDGET_HINT |
|---|---|
| 1 Sprint | `$3,500+ USD` |
| 2 Core | `$8,000+ USD` |
| 3 Deep | `$20,000+ USD` |
| 4 Brand Applications | `Custom` |

> ✅ Verifiqué que el atributo `BUDGET_HINT` ya existe en Brevo (text, normal). No hay que crearlo.

---

## Qué desaparece automáticamente cuando un campo viene vacío

| Campo vacío | Comportamiento |
|---|---|
| `EMAIL` | Se oculta solo esa fila |
| `SMS`, `BUSINESS_NAME`, `INDUSTRIA`, `WHERE_ARE_YOU_BASED` | Se ocultan filas individuales |
| **Todos los campos de Contacto vacíos** | Se oculta sección "Contacto" entera (incluido el hairline) |
| `TELL_US_ABOUT` | Se oculta sección "El proyecto" entera |
| `CAMPAIGN_*`, `ADSET_*`, `AD_NAME`, `FORM_ID` | Filas individuales |
| **Todos los de atribución vacíos** | Se oculta sección "Atribución" entera (lead orgánico) |
| `contact_id` ausente | Se oculta CTA "Abrir contacto en Brevo" |
| `NOMBRE` + `APELLIDOS` ambos vacíos | Headline cae a "Lead sin nombre" |

El Code step considera vacíos: `null`, `undefined`, `''`, `'null'`, `'undefined'`, `'none'`.

---

## Notas

- **Tipografía:** KMR Melange (custom de TBP) **no carga en clientes de email**. Fallback: `Helvetica Neue`.
- **Color azul TBP:** `#003DFF` aplicado en header, accent y CTA.
- **Subject:** se construye dinámicamente con `Nuevo lead ${label} — ${fullName}`.
- **Deal name:** también se construye en el Code step (`${fullName} – ${label}`) y se entrega ya armado al webhook.
- **Deal amount:** Brand Apps (CATEGORY 4) crea el deal **sin amount** — el Code step omite el campo y Brevo lo trata como deal sin monto. Sprint=3500, Core=8000, Deep=20000.
- **BUDGET_HINT:** se actualiza en el contacto vía upsert (`POST /v3/contacts` con `updateEnabled: true`). Si el contacto ya existe (caso normal porque el trigger se dispara cuando ya está en lista 17), solo modifica el atributo. Si por alguna razón el contacto fue borrado entre el trigger y el step, se vuelve a crear con BUDGET_HINT seteado.
