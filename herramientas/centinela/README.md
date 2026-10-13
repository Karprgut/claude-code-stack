# Centinela de privacidad

Detecta cuándo alguien empieza a usar tu Mac después de un rato de abandono y verifica si eres
tú. Si no, manda un push al iPhone (por [ntfy](https://ntfy.sh)) con la hora, qué app estaba al
frente y, si lo permites, la foto. Todo corre local: ninguna imagen ni huella facial sale de la
máquina salvo que pongas `ENVIAR_FOTO=1`.

Dos señales, en este orden:

1. **Apple Watch por Bluetooth.** Lo traes puesto: es la señal más difícil de falsear. Se
   identifica por **dirección MAC y no por nombre**, porque macOS escribe los nombres de los
   dispositivos Apple con un espacio no-rompible (`Apple\xa0Watch`) y cualquier comparación por
   texto falla en silencio. El umbral de RSSI es estricto a propósito: si fuera permisivo, un
   intruso se beneficiaría de que tu Watch ande por la oficina.
2. **Rostro con Vision.** Un binario Swift captura un fotograma, extrae la huella facial y la
   compara contra las seis fotos de referencia que tomaste al enrolarte. El umbral se calibra con
   la variación entre tus propias fotos.

| Watch cerca | Rostro | Veredicto |
|---|---|---|
| sí | tú | `eres_tu` (la foto se borra) |
| sí | otro / nadie | `probablemente_tu` |
| no | tú | `probablemente_tu` |
| no | otro / nadie | `DESCONOCIDO` → aviso |

## Archivos

| Archivo | Qué es |
|---|---|
| `centinela.swift` | `camaras`, `capturar`, `enrolar`, `comparar`: el binario de cámara + Vision |
| `Info.plist` | El app bundle. **Se usa el bundle y no el binario suelto** porque TCC conserva el permiso de cámara por identidad de bundle; un binario pelón lo pierde al correr bajo launchd |
| `vigia` | El bucle: mide inactividad con `ioreg`, dispara la verificación, escribe la bitácora, avisa |
| `watch_rssi.py` | Imprime el RSSI del Watch por MAC, o `ausente` |
| `centinelactl` | `enrolar`, `instalar`, `estado`, `probar`, `bitacora`, `alertas`, `reiniciar`, `detener`, `desinstalar` |
| `config.ejemplo.sh` | Topic de ntfy, MAC del Watch, umbrales, cámara, retención |
| `compilar.sh` | Compila el Swift, arma `Centinela.app` y lo firma ad hoc |

## Instalación

```bash
mkdir -p ~/.config/centinela/bin && cd ~/.config/centinela
cp /ruta/al/repo/herramientas/centinela/{centinela.swift,centinelactl,vigia,watch_rssi.py,compilar.sh} bin/
cp /ruta/al/repo/herramientas/centinela/Info.plist bin/
cp /ruta/al/repo/herramientas/centinela/config.ejemplo.sh config.sh
bash bin/compilar.sh                    # → ~/.config/centinela/Centinela.app
ln -s ~/.config/centinela/bin/centinelactl ~/.local/bin/centinelactl

# edita config.sh: NTFY_TOPIC (inventa uno largo), WATCH_ADDR (system_profiler SPBluetoothDataType)
centinelactl enrolar                    # 6 fotos tuyas; el LED prende
centinelactl probar                     # una verificación ahora
centinelactl instalar                   # LaunchAgent, arranca solo al iniciar sesión
```

La primera captura pide permiso de cámara en Ajustes del Sistema → Privacidad → Cámara para
"Centinela". Si cambias el binario, vuelve a correr `compilar.sh`: la firma ad hoc cambia y TCC
vuelve a preguntar.

## Suscribirte a los avisos

Instala la app ntfy en el iPhone y suscríbete al topic exacto de `NTFY_TOPIC`. Quien sepa el
topic puede ver tus avisos: hazlo largo y no lo compartas. Con `ENVIAR_FOTO=0` (default) la foto
se queda en tu Mac y el push nada más te avisa; ntfy.sh es un servidor público de terceros.
