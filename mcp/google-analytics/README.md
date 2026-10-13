# Google Analytics 4 por perfil

Una entrada por cuenta de Google con acceso a propiedades GA4. Los perfiles `kcl` y `adglow`
leen el `.env` de un proyecto (comparten el cliente OAuth de Google Ads: `GOOGLE_ANALYTICS_*`
cae a `GOOGLE_ADS_*`); cualquier otro nombre crea `~/.config/google-analytics-mcp/env.<perfil>`.

```bash
python3 ~/.config/google-analytics-mcp/authorize.py kabrita
#   1. verifica que el puerto 3000 esté libre
#   2. abre el navegador: autoriza con la cuenta que ve esas propiedades
#   3. guarda el refresh token (scope analytics.readonly) en env.kabrita
#   4. lista las propiedades GA4 que alcanza
#   5. claude mcp add google-analytics-kabrita --scope user -- run.sh kabrita
```

`GOOGLE_ANALYTICS_PROJECT_ID` (opcional) fija el proyecto de cuota; si tu cliente OAuth y la
API de GA4 viven en proyectos distintos de Cloud, lo necesitas.
