# google-ads-karma

Crear campañas de **Search** en Google Ads vía API. La campaña se crea **PAUSADA**: nada gasta hasta que tú la actives en la UI.

## Pasos (una sola vez)

### 1. Instalar
```bash
cd ~/google-ads-karma
npm install
```

### 2. OAuth client (Google Cloud Console)
1. Entra a https://console.cloud.google.com/ con `tu-cuenta@tu-dominio.com`
2. Crea (o reusa) un proyecto → **APIs y servicios → Habilitar APIs** → habilita **Google Ads API**
3. **Credenciales → Crear credenciales → ID de cliente de OAuth → Aplicación web**
4. En **URIs de redirección autorizados** agrega exactamente:
   `http://localhost:3000/oauth2callback`
5. Copia el **Client ID** y **Client Secret**

### 3. Llenar `.env`
```bash
cp .env.example .env
# edita .env con el developer token, client id/secret y los customer IDs
```

### 4. Generar refresh token
```bash
npm run token
```
Abre la URL que imprime, inicia sesión con `tu-cuenta@tu-dominio.com`, acepta,
y copia el `refresh_token` resultante a `.env`.

### 5. Configurar la campaña
```bash
cp campaign.config.example.json campaign.config.json
# edita keywords, presupuesto, URL, geo, copies, etc.
```

### 6. Crear
```bash
npm run create
```
Imprime el link directo a la campaña en Google Ads para revisarla y activarla.

## Notas
- **Developer token**: necesita al menos *Basic Access* aprobado para tocar cuentas reales.
- `login_customer_id` = la cuenta administradora (MCC). `customer_id` = la cuenta donde va la campaña. Ambos de 10 dígitos, sin guiones.
- Bidding por defecto: **MAXIMIZE_CLICKS** (no requiere conversiones). Cámbialo en el config.
- Para crear varias campañas, duplica `campaign.config.json` y ajusta el script, o repite con distinto config.
