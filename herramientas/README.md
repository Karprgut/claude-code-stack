# Herramientas sueltas

Cosas que no son de Claude pero viven en el mismo flujo de trabajo.

| Carpeta | Qué es |
|---|---|
| [centinela/](centinela/) | Avisa al iPhone si alguien que no eres tú empieza a usar tu Mac. Swift + Vision (rostro) + Bluetooth (Apple Watch) + ntfy. Todo local |
| [pdf-editor/](pdf-editor/) | Editor de texto de PDF en el navegador. Borra el texto original del content stream (no lo tapa) y escribe el nuevo en la misma línea base. Sitio estático, nada sube a un servidor |
| [tablero-vacantes/](tablero-vacantes/) | Lee Gmail por API (con las credenciales del MCP de Workspace) y arma un tablero local de correos de procesos de reclutamiento; empuja solo el resumen a un tablero en Vercel |
| [verificar-correos.py](verificar-correos.py) | Parte una lista de correos en limpios / dudosos / sucios con Bouncer o NeverBounce. Validar MX no sirve: los rebotes son buzones muertos en dominios vivos |
