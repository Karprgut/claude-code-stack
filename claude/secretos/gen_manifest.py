#!/usr/bin/env python3
"""Genera ~/Hub/secrets.md desde el vault. NUNCA escribe valores, solo nombres y hashes."""
import hashlib, pathlib, re, subprocess, time

HOME = pathlib.Path.home(); VAULT = HOME/".secrets"

def read_env(p):
    out={}
    if not p.exists(): return out
    for ln in p.read_text(errors="replace").splitlines():
        l=ln.strip()
        if not l or l.startswith("#") or "=" not in l: continue
        k,v=l.split("=",1); out[k.strip()]=v
    return out

MAN=[]
for ln in (VAULT/"manifest.tsv").read_text().splitlines():
    if not ln.strip() or ln.startswith("#"): continue
    MAN.append(ln.split("\t"))
SLUGS={s:(t,r) for s,t,r in MAN}
TEN={f.stem:read_env(f) for f in (VAULT/"tenants").glob("*.env")}
OWN={s:read_env(VAULT/"files"/f"{s}.env") for s,_,_ in MAN}
def eff(s):
    v=dict(TEN.get(SLUGS[s][0],{})); v.update(OWN[s]); return v
def h6(v): return "(vacio)" if v=="" else hashlib.sha1(v.encode()).hexdigest()[:6]

NOMBRE={"empresa-a":"Empresa A","empresa-b":"Empresa B","huerfano":"Huérfano"}
VEREDICTO={
 # variable: (veredicto, por qué). Llena esto con TU criterio por variable divergente.
 "SITE_URL":("legítima","sitios distintos por entorno"),
 "CRON_SECRET":("legítima","apps distintas deben tener secretos de cron distintos"),
}

L=[]; a=L.append
a("# Secretos — mapa cruzado de variables de entorno")
a("")
a("**Este archivo no contiene ni un solo valor.** Solo nombres, en qué archivos viven y hashes de")
a("6 caracteres para comparar sin exponer. Los valores están en `~/.secrets`, fuera de todo repo de git.")
a("")
a(f"*Generado contra disco: {time.strftime('%Y-%m-%d')}.*")
a("")
a("## Para qué existe")
a("")
a("Antes: 40 variables repetidas en 10 archivos `.env` de cuatro proyectos, 15 de ellas con valores")
a("distintos entre copias. Renovar un token significaba editar de 2 a 4 archivos y adivinar cuál copia")
a("era la buena. Ahora el vault es la fuente de verdad y las copias se regeneran.")
a("")
a("**Para una consulta puntual usa el CLI, no este archivo.** `secret where VAR` cuesta ~64 tokens;")
a("este archivo completo cuesta ~3,200, parecido a abrir tres `.env`. La diferencia con abrir un `.env`")
a("no es el costo: es que aquí sí está dicho cuál copia es la canónica.")
a("")
a("Lee el archivo entero cuando necesites el panorama: auditar credenciales, decidir cómo separar")
a("las apps de OAuth, o entender por qué dos copias divergen.")
a("")
a("## El CLI")
a("")
a("```sh")
a("secret files                 # el mapa de archivos")
a("secret list [slug]           # nombres de variables, sin valores")
a("secret get VAR [slug]        # UN valor (avisa si hay ambigüedad entre copias)")
a("secret where VAR             # en qué archivos vive y si coinciden")
a("secret check                 # divergencias, llaves inválidas y cruces entre empresas")
a("secret diff --all            # ¿el vault sigue reproduciendo los .env en disco?")
a("secret sync --all            # propaga el vault a los .env (respalda antes)")
a("secret notas                 # credenciales sin proyecto asignado")
a("```")
a("")
a("Vive en `~/tools/secret`. El flujo de renovación es: editas **una** vez en `~/.secrets/tenants/<empresa>.env`,")
a("corres `secret sync --all`, y todas las copias quedan al día. Las env vars de Railway y Vercel son aparte:")
a("el vault no las toca.")
a("")
a("## Los tres inquilinos")
a("")
a("La estructura real no son 12 proyectos, son tres conjuntos de credenciales:")
a("")
a("| Inquilino | Archivos | Variables | Notas |")
a("|---|---|---|---|")
for t in ("empresa-a","empresa-b","huerfano"):
    slugs=[s for s,_,_ in MAN if SLUGS[s][0]==t]
    tot=len({k for s in slugs for k in eff(s)})
    a(f"| **{NOMBRE[t]}** | {len(slugs)} | {tot} | {len(TEN.get(t,{}))} compartidas en `tenants/{t}.env` |")
a("")
a("| slug | inquilino | archivo | del inquilino | propias |")
a("|---|---|---|---|---|")
for s,t,r in MAN:
    tv=TEN.get(t,{})
    a(f"| `{s}` | {t} | `{r}` | {len([k for k in eff(s) if k in tv])} | {len(OWN[s])} |")
a("")
a("## Variables compartidas — el vault ya las unificó")
a("")
ahorro=0
for t in ("empresa-a","empresa-b"):
    tv=TEN.get(t,{})
    if not tv: continue
    slugs=[s for s,_,_ in MAN if SLUGS[s][0]==t]
    a(f"### {NOMBRE[t]} — {len(tv)} variables")
    a("")
    a("| variable | copias | archivos |")
    a("|---|---|---|")
    for k in sorted(tv):
        hold=[s for s in slugs if k in eff(s)]
        ahorro += len(hold)-1
        a(f"| `{k}` | {len(hold)} | {', '.join(f'`{h}`' for h in hold)} |")
    a("")
a(f"Son **{ahorro} copias redundantes** que dejaron de necesitar edición manual.")
a("")
a("## Divergencias — cuál es la buena")
a("")
a("Misma variable, valor distinto entre archivos del mismo inquilino. El vault conserva cada copia")
a("como estaba: no adiviné cuál era la canónica.")
a("")
a("| variable | inquilino | veredicto | por qué |")
a("|---|---|---|---|")
for t in ("empresa-a","empresa-b"):
    slugs=[s for s,_,_ in MAN if SLUGS[s][0]==t]
    for k in sorted({k for s in slugs for k in eff(s)}):
        hs={s:h6(eff(s)[k]) for s in slugs if k in eff(s)}
        if len(set(hs.values()))<=1: continue
        v,why=VEREDICTO.get(k,("revisar",""))
        mark={"legítima":"✅ legítima","confirmar":"❓ confirmar","deriva":"⚠️ deriva","revisar":"❓ revisar"}[v]
        a(f"| `{k}` | {t} | {mark} | {why} — " + ", ".join(f"`{s}`[{h}]" for s,h in hs.items()) + " |")
a("")
a("## El riesgo que sí importa: una app de OAuth para dos empresas")
a("")
a("Estas cuatro variables tienen **el mismo valor** en Empresa A y en Empresa B:")
a("")
a("| variable | hash | consecuencia |")
a("|---|---|---|")
cross={}
for k in sorted({k for s,_,_ in MAN for k in eff(s)}):
    by={}
    for s,_,_ in MAN:
        v=eff(s).get(k)
        if v is not None: by.setdefault(h6(v),set()).add(SLUGS[s][0])
    for h,ts in by.items():
        if len(ts)>1: cross[k]=(h,sorted(ts))
CONSEC={
 "GOOGLE_ADS_CLIENT_ID":"misma app de OAuth de Google Cloud",
 "GOOGLE_ADS_CLIENT_SECRET":"misma app de OAuth de Google Cloud",
 "GOOGLE_ADS_DEVELOPER_TOKEN":"mismo developer token de la API de Google Ads",
 "TIKTOK_APP_ID":"misma app de TikTok",
}
for k,(h,ts) in cross.items():
    a(f"| `{k}` | `{h}` | {CONSEC.get(k,'compartido entre '+'+'.join(ts))} |")
a("")
a("Los `GOOGLE_ADS_REFRESH_TOKEN` sí son distintos por empresa, que es lo correcto — cada uno autoriza")
a("su propio MCC. Pero cuelgan de la misma app de OAuth. Si esa app se revoca, se rota el secret, o")
a("Google la suspende, **el reporteo de las dos empresas se cae al mismo tiempo**.")
a("")
a("Agrava el asunto que ese consent screen sigue en modo *Testing*, lo que caduca los refresh tokens")
a("cada 7 días (ver `reference_google_ads_token_renewal` en la memoria de Adglow). Separar las dos")
a("empresas en apps de OAuth distintas es la decisión pendiente más cara de no tomar.")
a("")
a("## Credenciales rescatadas sin proyecto")
a("")
a("Las primeras cuatro líneas de `Karma Creative Lab Shopify/.env` estaban escritas con espacios en la")
a("llave (`TBP Webflow Token=…`), así que **ningún loader de `.env` las leía**. Estaban ahí como notas.")
a("Quedaron en `~/.secrets/notas/kcl-credenciales-sueltas.env` con un nombre sugerido cada una:")
a("")
a("| anotado como | nombre sugerido | pendiente |")
a("|---|---|---|")
a("| `TBP Webflow Token` | `WEBFLOW_TOKEN_TBP` | ¿qué proyecto lo necesita? |")
a("| `SITE ID` | `WEBFLOW_SITE_ID_TBP` | confirmar de qué plataforma es el site |")
a("| `ADOBE Token` | `ADOBE_TOKEN` | ¿qué proyecto lo necesita? |")
a("| `BREVO CLAVE API` | `BREVO_API_KEY` | ¿qué proyecto lo necesita? |")
a("")
a("`secret check` ahora avisa si vuelve a aparecer una llave inválida en cualquier `.env`.")
a("")
a("## Estado del tracking de KCL")
a("")
a("`karma-backend/.env.tracking.local` está vivo (lo carga `lib/tracking/env.ts`) y con `TRACKING_DRY_RUN=0`,")
a("o sea mandando de verdad. Meta CAPI y la etiqueta de compra de Google Ads están configuradas.")
a("Quedaron sin llenar: `TIKTOK_PIXEL_ID`, `TIKTOK_EVENTS_TOKEN` y `GOOGLE_ADS_LEAD_LABEL`.")
a("`GA4_API_SECRET` está vacío a propósito.")
a("")
a("## Decisiones pendientes")
a("")
a("- [ ] Separar Adglow y KCL en apps de OAuth de Google Cloud distintas.")
a("- [ ] Sacar el consent screen de Adglow de modo *Testing* para matar la caducidad de 7 días.")
a("- [ ] Reconciliar `META_ACCOUNTS_JSON` y `LINKEDIN_ACCOUNTS_JSON` entre `kcl-backend` y `kcl-theme`.")
a("- [ ] Confirmar si los dos pixeles de Meta y las dos propiedades de GA4 de KCL son intencionales.")
a("- [ ] Asignar proyecto a las cuatro credenciales rescatadas, o darlas de baja.")
a("- [ ] `google-ads-karma` usa su propia app de OAuth, distinta de las otras dos. Está **activo**")
a("      (`tbp_gads.mjs` se tocó el 2026-09-09) y no tiene git. Decidir si se unifica con el inquilino")
a("      KCL o se queda aparte, y si merece repo.")
a("")
a("## Limpieza hecha y lo que quedó pendiente")
a("")
a("Respaldo de los 12 `.env` originales antes de tocar nada: `~/.secrets-backup-20260910-095705.tar.gz` (permisos 600).")
a("")
a("| archivo | qué se hizo | por qué |")
a("|---|---|---|")
a("| `adglow/.env.local.bak` | **retirado** | 43 variables, ninguna única; su `GOOGLE_ADS_REFRESH_TOKEN` era una versión ya rotada |")
a("| `flint-app/flint-v1.0.0 2/dashboard/.env.local` | **se dejó** | el Hub lo daba por muerto, pero tiene archivos iOS modificados en julio que `~/flint` no tiene. Guarda versiones viejas de `META_TOKEN_KAB/RTH/TBP`. Retirarlo es decisión de Kar |")
a("| `google-ads-karma/.env` | **se dejó** | el proyecto está activo, se tocó el 2026-09-09 |")
a("")
a("Los 10 `.env` vivos quedaron **intactos**: el vault se construyó a partir de ellos y `secret diff --all`")
a("confirma que los reproduce byte por byte. No se sincronizó nada porque no había nada que cambiar.")
a("")
a("## Reglas")
a("")
a("1. **Ningún valor entra a este archivo.** Nombres y hashes, nada más. Este archivo se commitea.")
a("2. **`~/.secrets` nunca entra a un repo.** Permisos 700 en la carpeta, 600 en los archivos.")
a("3. **Renueva en el vault, no en el `.env`.** Editar un `.env` a mano vuelve a abrir la divergencia.")
a("4. **Corre `secret diff --all` antes de `sync`.** Si algo sale distinto, alguien editó a mano.")
a("5. **Railway y Vercel son aparte.** El vault es local; las env vars de producción se actualizan a mano.")

(HOME/"Hub"/"secrets.md").write_text("\n".join(L)+"\n")
print("escrito ~/Hub/secrets.md")
print("lineas:", len(L))
