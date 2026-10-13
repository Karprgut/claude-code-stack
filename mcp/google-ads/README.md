# Google Ads por perfil

- `run.sh <perfil>`: resuelve el perfil a un `.env`, arma `adc-<perfil>.json` y ejecuta el MCP
  oficial. Los perfiles de ejemplo (`adglow`, `adglow-mcc`, `kcl`) apuntan cada uno a un `.env`
  distinto; renómbralos y cambia las rutas del `case` al principio del script.
- `authorize.py <perfil>`: OAuth en el navegador con scope `adwords`, guarda
  `GOOGLE_ADS_REFRESH_TOKEN` en el `.env` del perfil y registra el servidor.
- `authorize-datamanager.py`: variante que pide **dos scopes**, `adwords` + `datamanager`.
  Desde octubre de 2026 Google exige la Data Manager API para subir conversiones offline
  ("new integrations must use the Data Manager API") y esa API pide su propio scope. Si tu token
  solo trae `adwords`, la subida falla con un error de permisos que no dice nada de scopes.

Variables que lee del `.env`:

```
GOOGLE_ADS_CLIENT_ID
GOOGLE_ADS_CLIENT_SECRET
GOOGLE_ADS_REFRESH_TOKEN
GOOGLE_ADS_DEVELOPER_TOKEN
GOOGLE_ADS_LOGIN_CUSTOMER_ID      # el MCC, sin guiones
```

Override por entorno: `GOOGLE_ADS_ENV_FILE` (otro `.env`), `GOOGLE_ADS_MCP_LOGIN` (otro MCC con el
mismo token; así una entrada ve un MCC distinto sin reautorizar).

Registro manual si no quieres usar `authorize.py`:

```bash
claude mcp add google-ads-<perfil> --scope user -e GOOGLE_ADS_MCP_LOGIN=<MCC_ID> -- ~/.config/google-ads-mcp/run.sh <perfil>
```
