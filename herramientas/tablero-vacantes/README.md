# Tablero de vacantes

Un tablero local de los correos de procesos de reclutamiento (postulaciones, entrevistas,
reclutadores) de una o varias cuentas de Gmail, con un empujador que manda **solo el resumen**
(remitente, asunto, fecha, extracto, liga a Gmail) a un tablero en Vercel para verlo desde el
teléfono.

Lee Gmail por la API REST con los refresh tokens que ya dejó [`mcp/google-workspace/authorize.py`](../../mcp/google-workspace/authorize.py)
en `~/.config/google-workspace-mcp/credentials/`. No usa MCP: una rutina desatendida que llama un
conector MCP se cuelga en silencio, y esto tiene que seguir sirviendo aunque una de las cuentas
deje de existir. Solo stdlib; escucha nada más en `127.0.0.1`.

```bash
# edita CUENTAS en servidor.py y la consulta (CONSULTA_CLAVES) si tu idioma de vacantes es otro
./iniciar.sh                      # levanta el servidor en :8787 y abre el navegador
python3 empujar.py --seco         # qué mandaría al tablero remoto
python3 empujar.py                # empuja
```

`~/.config/tablero-vacantes/env` lleva `TABLERO_URL` y `TABLERO_PUSH_SECRET` del tablero remoto
(un endpoint que recibe JSON con ese secreto en un header; el receptor no está en este repo, es
un endpoint de Next.js de cuatro líneas). El `.plist` en
[`../../automatizaciones/launchd/`](../../automatizaciones/launchd/) lo corre cada 15 minutos.

Lo que nunca sale de la máquina: el `client_secret` y los refresh tokens de Google.
