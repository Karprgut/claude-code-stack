# Automatizaciones: launchd + `claude -p`

Rutinas desatendidas que corren en la Mac, traen datos por API, arman un HTML y lo republican
sobre **el mismo artifact de claude.ai** cada día (misma URL, versión nueva). El cliente o el
equipo tienen un link fijo que amanece actualizado.

| Carpeta | Qué hace | Cuándo corre | Fuentes |
|---|---|---|---|
| [reporte-leads/](reporte-leads/) | Reporte de leads del mes con comparativa, calidad por heurística, atribución al primer contacto, hallazgos por regla. Guarda histórico en SQLite y sube conversiones del CRM a Google Ads | lunes 8:30 | Brevo CRM + Meta Ads + Google Ads (Data Manager API) |
| [radar-linkedin/](radar-linkedin/) | Busca en LinkedIn empresas que piden agencia (MX, CO, PE, US), filtra vacantes y autopromoción, enriquece con autor y competencia en comentarios | diario 10:00 | Exa + Scrape Creators |
| [monitor-pauta/](monitor-pauta/) | Descubre lo activo en todas las cuentas de pauta y alerta una vez cuando algo que servía deja de servir | cron cada 6 h | Google Ads + Meta + TikTok |
| [launchd/](launchd/) | Los `.plist` de las rutinas, listos para adaptar | — | — |

Las dos primeras son ejemplos reales de un cliente de la agencia con los identificadores
quitados; el código es el que corre hoy. Adapta tiers, pipelines y diseño a tu caso.

## El patrón

```
run.sh
 ├─ 1. build.py       datos por API con credencial → out/reporte.html
 ├─ 2. claude -p      "lee el artifact X y republica en ESA url el archivo out/reporte.html"
 │        --allowedTools Artifact --output-format json --json-schema '{publicado, version, detalle}'
 └─ 3. verificación   is_error == false  &&  publicado == true  &&  version > versión anterior
                      si no → exit 1 + notificación de macOS
```

### Las cuatro reglas, cada una con su cicatriz

1. **Los datos se traen por API con credencial, nunca por MCP.** Una rutina desatendida que llama
   un conector MCP se cuelga en silencio. Los MCP son para la sesión interactiva.
2. **`export CLAUDE_CODE_ENTRYPOINT=claude-vscode` antes de `claude -p`.** La herramienta Artifact
   solo se expone cuando el entrypoint es un anfitrión que sabe mostrar artifacts. Bajo launchd el
   entrypoint es `cli`, la herramienta no existe, y el log decía "OK" sin publicar nada. Así se
   perdió una semana de cortes.
3. **`claude -p` sale con 0 aunque el agente no publique.** La única prueba aceptable es la salida
   estructurada (`--json-schema`), y la versión del artifact solo avanza: exigirla **mayor** a la
   del corte anterior descarta tanto un "ya estaba publicado" como una versión inventada.
4. **Cuidado con `//` en jq.** `a // b` devuelve `b` cuando `a` es `false` **o** `null`, así que
   `.is_error // true` daba `true` incluso con `is_error=false` y el chequeo no podía pasar nunca.
   Las comparaciones van explícitas: `if .is_error == false then "false" else "true" end`.

Además: el publish exige que la conversación haya **leído** el artifact primero, por eso el prompt
pide leer y luego republicar. La respuesta completa se guarda en `out/.ultima-respuesta.json` para
diagnosticar sin repetir la corrida (cada una cuesta dinero y tarda minutos).

### launchd

- `StartCalendarInterval` para hora fija, `StartInterval` para cada N segundos. Si la Mac estaba
  dormida a esa hora, launchd corre la rutina al despertar; sin eso, un día dormido es un día
  perdido y el histórico no se recupera.
- **Rutas absolutas**: launchd no expande `~`. Un repo que se mueve mata la rutina en silencio
  (un monitor murió 13 días sin avisar por un `ENOENT`). Revisa `logs/launchd.err.log`.
- `PATH` explícito en `EnvironmentVariables` si el script usa `claude`, `node` o `jq`.
- Cargar: `launchctl load ~/Library/LaunchAgents/<etiqueta>.plist`. Ver: `launchctl list | grep <etiqueta>`.
- Las credenciales viven en `~/.config/<rutina>/env` con permisos 600; `run.sh` las `source`a.

### El link compartido tiene truco

El artifact se comparte "con cualquiera que tenga el link", pero quien lo abra ve **la versión
anclada**, no la última. Hay que mover el pin de compartir una vez desde el menú de la página;
mientras no, la rutina actualiza y el link público se queda en la versión vieja.
