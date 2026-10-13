# ───────── Configuración del centinela ─────────
# Edita este archivo y reinicia con:  centinelactl reiniciar

# --- Avisos por ntfy (push al iPhone) ---
# Este "topic" es tu dirección privada. Quien lo sepa puede ver tus avisos,
# así que no lo compartas. Suscríbete en la app ntfy con exactamente este texto.
NTFY_TOPIC=""            # p. ej. el resultado de: openssl rand -hex 12
NTFY_SERVIDOR="https://ntfy.sh"

# ¿Adjuntar la foto en el push?  0 = no (recomendado), 1 = sí
# En 0, la foto se queda SOLO en tu Mac y el push nada más te avisa. ntfy.sh es
# un servidor público de terceros: en 1, la imagen pasa por ahí.
ENVIAR_FOTO=0

# --- Cuándo verificar ---
# Se verifica cuando alguien empieza a usar la máquina después de una ausencia.
SEGUNDOS_AUSENCIA=120      # inactividad que cuenta como "no había nadie"
SEGUNDOS_ACTIVO=20         # actividad reciente que cuenta como "alguien llegó"
SEGUNDOS_ENFRIAMIENTO=600  # no volver a verificar antes de este tiempo
INTERVALO_SONDEO=10        # cada cuánto mira el estado de inactividad

# --- Señal del Apple Watch ---
# Si tu Watch está en rango de Bluetooth, eres tú. Es la señal más confiable
# porque lo traes puesto. -75 dBm ≈ unos metros; más negativo = más lejos.
# Se identifica por dirección MAC y no por nombre: macOS escribe el nombre con
# un espacio no-rompible ("Apple\xa0Watch") y el match por texto nunca pega.
WATCH_ADDR=""            # MAC del Watch, la ves en: system_profiler SPBluetoothDataType
# Umbral estricto a propósito. Si fuera permisivo, un intruso se beneficiaría
# de que tu Watch ande por la oficina; estricto, tu respaldo es tu cara.
WATCH_RSSI_MINIMO=-82

# --- Cámara ---
# Fragmento del nombre de la cámara a usar. Vacío = la externa, y si no hay,
# la interna. En dock con la tapa cerrada la interna no sirve.
CAMARA_PREFERIDA=""      # fragmento del nombre; vacío = la externa si hay, si no la interna

# --- Retención ---
DIAS_GUARDAR_FOTOS=60
