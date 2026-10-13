# Workflow con extensión Claude Chrome para Google Ads

Para Google Ads, en lugar de pelear con Playwright + shadow DOM de Material Components, usamos la extensión Chrome de Claude para que descargue los CSVs manualmente y los deje en la carpeta correcta.

**Trigger:** 2 veces al día (9am y 6pm) — lo invocas tú cuando sea momento.

## Prompt para la extensión

Cuando abras Chrome (con tus sesiones ya logueadas en las 3 cuentas Google Ads) e invoques la extensión Claude, pega:

```
Descarga el reporte de campañas de Google Ads para las 3 cuentas y guarda los CSVs en ~/flint-starter-v0.0.2/ops/campaigns/data/_downloads/:

1. Kabrita (customer 458-921-8366, login media@ladon.mx)
2. Ruth's Chris (customer 635-947-3348, login tu-cuenta@tu-dominio.com)
3. TBP (customer 294-973-2003, login otra-cuenta@dominio.com)

Para cada cuenta:
- Navega a ads.google.com → cambia al customer correcto
- Selecciona "This month" en el date picker
- Click en la TABLA de campañas (no el gráfico superior) para que tome ese contexto
- Click en "Download" → ".csv"
- Renombra el archivo a `google-{customerId}-{timestamp}.csv`
- Mueve a ~/flint-starter-v0.0.2/ops/campaigns/data/_downloads/

Después corre: `cd ~/flint-starter-v0.0.2/ops/campaigns && pnpm tsx parse-google-downloads.ts`
```

## Parser para CSVs descargados manualmente

Crear `ops/campaigns/parse-google-downloads.ts` que:
1. Lee todos los archivos `google-{customerId}-*.csv` en `data/_downloads/`
2. Parsea cada uno con el mismo código de `scrapers/google-ads.ts` (función `scrapeAccount` refactorizada)
3. Genera `data/google-ads-latest.json` en el mismo formato que los otros scrapers
4. El dashboard lo lee automáticamente vía `consolidated.json`

## Integración con el resto

El parser debe producir la misma estructura `AccountSnapshot` que los otros scrapers para que el dashboard lo consuma igual. No se requieren cambios en el dashboard ni en `run.ts`.

## Por qué este approach

- **Pros:**
  - Sesiones nativas de Chrome (cero bugs de 2FA/cookies)
  - UI renderizada por completo (Material Components sin shadow DOM oculto)
  - Selectores visibles para humano/agent
  - Cero fragilidad ante cambios de Google Ads
- **Contras:**
  - No automatizable con cron (requiere Kari + Claude activos)
  - 2 min de trabajo 2x/día

## Status actual

- [ ] Crear `parse-google-downloads.ts` (reutilizar lógica de scrapers/google-ads.ts pero sin Playwright)
- [ ] Probar workflow end-to-end con la extensión
- [ ] Agregar página de instrucciones en el dashboard para que Kari recuerde el prompt
