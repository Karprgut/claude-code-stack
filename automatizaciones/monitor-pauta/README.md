# Monitor de pauta

Un solo script que, cada 6 horas, descubre qué campañas están activas en **todas** las cuentas
(Google Ads, Meta, TikTok), lo compara contra un baseline y alerta **una sola vez** cuando algo
que servía deja de servir, cuando una campaña activa desaparece o cuando le ponen fecha de fin.

Sustituyó a un monitor con lista fija de campañas que se desfasaba solo (cuatro campañas nuevas
quedaron fuera) y que murió 13 días sin avisar cuando se movió el repo del que leía el `.env`.

```bash
cp check-all.mjs ~/monitor-pauta/
# edita GOOGLE / META / TIKTOK con tus cuentas y ENV_CANDIDATES con la ruta de tu .env
crontab -e
#   0 */6 * * * /usr/local/bin/node /Users/<usuario>/monitor-pauta/check-all.mjs >> /Users/<usuario>/monitor-pauta/cron.log 2>&1
```

Qué considera "sirve" en cada plataforma, porque no es lo mismo:

- **Google:** `primary_status` en `ELIGIBLE`, `LIMITED` (topada por presupuesto, normal) o `LEARNING`.
- **Meta:** `ACTIVE` **y con gasto en los últimos 7 días**. "ACTIVE" no significa que entregue: un
  cliente tenía 57 campañas activas y solo 3 gastaban; el resto eran viejas con los ad sets
  apagados. Sin este filtro, pausar una zombie dispara una alerta que a nadie le importa.
- **TikTok:** `operation_status = ENABLE` y sin `DELETE` en el estado secundario.

Si ninguna plataforma responde, no confunde "todo apagado" con "no pude consultar": sale con error
y notifica. El baseline se actualiza siempre, así cada cambio alerta una vez y deja de taladrar.
La alerta va a una notificación de macOS y a un archivo en el Escritorio que se borra solo cuando
todo vuelve a estar bien.

Los tokens de TikTok en mi caso viven en una colección de Mongo (`ad_clients`); si los tuyos están
en el `.env`, cambia `collectTiktok` para leerlos de ahí.
