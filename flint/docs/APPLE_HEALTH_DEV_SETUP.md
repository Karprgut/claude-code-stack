# Apple Health (HealthKit) — Setup en Apple Developer

Documento para **<owner del Apple Developer Team>** (owner del Apple Developer Team). Objetivo: habilitar la capability de **HealthKit** en el App ID de Flint para que la app pueda leer datos de salud de <usuaria> (peso, pasos, sueño, frecuencia cardíaca, etc.) directo de la app Health del iPhone.

**Tiempo estimado:** 5–10 minutos.

---

## Contexto rápido

Estoy armando una integración para que la app de **Flint** (iOS, ya publicada internamente al team) sincronice datos de la app **Health** del iPhone de <usuaria> hacia su dashboard personal. Para que la app pueda **leer** esos datos, Apple requiere que el App ID tenga la capability "HealthKit" habilitada.

Esa habilitación solo la puede hacer **el owner del team** desde developer.apple.com. Yo (con mi Apple ID dev) puedo escribir el código y agregar el archivo de entitlements en Xcode, pero el server-side de Apple solo te deja a ti, <owner del Apple Developer Team>, prender la capability sobre el App ID.

**Tras este setup, el flujo completo va a ser:**
1. <usuaria> abre la app de Flint en su iPhone
2. La app le pide permiso para leer sus datos de Health
3. <usuaria> aprueba (puede elegir qué métricas compartir)
4. La app sincroniza automáticamente con su dashboard

Sin la capability prendida, la app crashea al intentar inicializar HealthKit en runtime.

---

## Datos del proyecto que vas a necesitar

| | |
|---|---|
| **App ID (Bundle Identifier)** | `com.flint.app` |
| **App Name** | Flint |
| **Plataforma** | iOS |
| **Team** | (el tuyo — el que ya tiene este App ID registrado) |

---

## Pasos

### 1. Login a Apple Developer

https://developer.apple.com/account

Loguéate con la Apple ID owner del team.

### 2. Identificar el App ID

1. En el dashboard, click **Certificates, Identifiers & Profiles**
2. En la barra lateral izquierda, click **Identifiers**
3. Asegúrate que el filtro arriba a la derecha diga **"App IDs"** (no "Services IDs")
4. Busca en la lista: **`com.flint.app`**
5. Click en él para abrirlo

> Si no aparece, dímelo — significa que el App ID nunca se registró formalmente. En ese caso hay que crearlo, pero típicamente se crea automáticamente la primera vez que se hace un build firmado.

### 3. Habilitar HealthKit

Dentro del App ID:

1. Scrollea hasta encontrar la lista de **Capabilities** (es una tabla larga con checkboxes)
2. Busca **HealthKit**
3. Marca el checkbox a su izquierda
4. Click **Save** arriba a la derecha
5. Apple te va a mostrar un warning del tipo *"Modifying this App ID will invalidate existing provisioning profiles..."* — click **Confirm**

### 4. Sub-capabilities (opcional pero recomendado)

Después de marcar HealthKit, click en **"Edit"** (o el ⓘ) junto al checkbox de HealthKit. Te abre un sub-modal con:

- ☑ **Background Delivery** — déjalo activado (default). Permite que el iPhone notifique a la app cuando lleguen datos nuevos sin que la app esté abierta.
- ☐ **Clinical Health Records** — déjalo apagado. Aplica solo a integraciones con sistemas hospitalarios EHR, no aplica a este caso.

Click **Done** → **Save**.

### 5. Si usan provisioning profiles manuales (probablemente NO aplica)

Apple va a invalidar los provisioning profiles existentes que usen este App ID. Si yo tengo profiles manuales descargados, necesito regenerarlos.

**Si en Xcode tengo "Automatically manage signing" habilitado** (lo más común y lo que usamos): Xcode regenera los profiles automáticamente al siguiente build. **Tú no tienes que hacer nada más** después del Save.

**Si tienes provisioning profiles manuales** (sé honesto si dudas — normalmente solo los manejas si has hecho enterprise distribution o adhoc específicamente):
1. **Profiles** (en la barra lateral)
2. Localiza los profiles del App ID `com.flint.app` que estén "Invalid"
3. Por cada uno: click → **Edit** → **Save** (esto regenera con HealthKit incluida)
4. Descarga los nuevos `.mobileprovision` files
5. Mándamelos por chat/mail

---

## Cómo confirmar que funcionó

Después del Save, en la página del App ID `com.flint.app`, en la lista de Capabilities, **HealthKit** debe aparecer marcada con palomita.

Mándame screenshot de la pantalla con HealthKit marcado para confirmar 👍

---

## ¿Qué sigue después de tu parte?

Una vez confirmes que HealthKit quedó habilitada, yo (<usuaria>) voy a:

1. Agregar el archivo `Flint.entitlements` al proyecto Xcode con la entry `com.apple.developer.healthkit`
2. Agregar al Info.plist los strings que iOS exige para pedir permisos al usuario:
   - `NSHealthShareUsageDescription` — "Flint necesita leer tu actividad para mostrarte tus métricas en el dashboard"
   - `NSHealthUpdateUsageDescription` (por si en el futuro queremos que la app escriba a Health también)
3. Implementar `HealthKitManager.swift` con la lógica de pedir permisos, leer datos y sincronizar
4. Probar en mi iPhone (TestFlight build)

Nada de eso requiere de ti. Solo el step de prender la capability.

---

## Datos que vamos a leer (para tu visibilidad/peace of mind)

Solo lectura. La app **no escribe** nada a Health. Métricas:

- Peso, IMC
- Pasos diarios
- Horas de sueño
- Frecuencia cardíaca (promedio + en reposo)
- Calorías quemadas, minutos activos
- Ciclo menstrual
- Glucosa en sangre
- VO2 max (si tiene Apple Watch)
- Esfuerzo de workouts (Apple Watch Series 9+)

Todo se sincroniza al dashboard personal de <usuaria> (en su EC2 privada). No hay tracking analytics ni envío a terceros — el flujo es **iPhone → su propio servidor → su dashboard**.

---

## Si te trabas

Mándame screenshot de donde te atores. Las UIs de Apple Developer cambian seguido y a veces los pasos se mueven.
