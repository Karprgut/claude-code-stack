# Google Workspace multi-cuenta

A diferencia de Analytics, aquí **no** hay un servidor por cuenta: un solo `workspace-mcp` lee
todas las credenciales de `~/.config/google-workspace-mcp/credentials/` y cada herramienta recibe
la cuenta en el parámetro `user_google_email`. Así una sesión puede leer el Gmail de la empresa y
escribir en el Drive de un cliente sin cambiar de servidor.

```bash
python3 ~/.config/google-workspace-mcp/authorize.py correo@dominio.com   # una vez por cuenta
echo correo@dominio.com > ~/.config/google-workspace-mcp/default-email    # la cuenta por defecto
claude mcp add google-workspace --scope user -- ~/.config/google-workspace-mcp/run.sh
```

`authorize.py` pide permisos de lectura y escritura (Gmail modify/compose/send/labels, Drive,
Calendar, Docs, Sheets, Slides, Tasks) y corre una prueba de humo por servicio: si una API no
está habilitada en el proyecto de Cloud, lo ves ahí y no tres días después.

`WORKSPACE_TOOL_TIER` controla cuántas herramientas expone: `core` (27), `extended` (60, el
default: trae adjuntos de Gmail, etiquetas, borradores, hilos) o `complete`.

**Adjuntos pesados.** Los conectores en la nube piden el archivo en base64 inline (~50 KB
máximo). El servidor local sí adjunta archivos grandes por `path` si los copias antes a
`~/.workspace-mcp/attachments/`.
