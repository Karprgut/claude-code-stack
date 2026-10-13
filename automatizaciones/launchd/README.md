# Plantillas de launchd

| Archivo | Rutina | Disparo |
|---|---|---|
| `reporte-leads.plist` | [../reporte-leads/](../reporte-leads/) `run.sh` | lunes 8:30 |
| `conversiones-google.plist` | [../reporte-leads/](../reporte-leads/) `subir_conversiones_google.py` | diario 9:05 |
| `radar-linkedin.plist` | [../radar-linkedin/](../radar-linkedin/) `run.sh` | diario 10:00 |
| `tablero-vacantes.plist` | [../../herramientas/tablero-vacantes/](../../herramientas/tablero-vacantes/) `empujar.py` | cada 15 min |

Antes de cargar: cambia `/Users/<usuario>/…` por rutas absolutas reales (launchd no expande `~`),
y la etiqueta `io.ejemplo.*` por la tuya.

```bash
cp reporte-leads.plist ~/Library/LaunchAgents/io.tuorg.reporte-leads.plist
launchctl load ~/Library/LaunchAgents/io.tuorg.reporte-leads.plist
launchctl list | grep tuorg                 # ¿cargada?
launchctl unload ~/Library/LaunchAgents/io.tuorg.reporte-leads.plist   # apagar
```

Para probar sin esperar la hora: corre el `run.sh` a mano desde cualquier terminal; hace
exactamente lo mismo que launchd.
