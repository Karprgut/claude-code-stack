#!/usr/bin/env python3
"""Ingesta histórica de leads de TBP → SQLite.

El reporte diario es una foto del mes en curso: rota el día 1 y lo anterior se
pierde de vista. Para el post mortem de cierre y el dashboard acumulado hace
falta el histórico completo, así que esto guarda cada día lo que las APIs
devuelven y lo acumula sin pisar lo anterior.

Qué conserva y por qué:
  · lead         — cada contacto como entró, con su atribución de primer
                   contacto ya resuelta (el cálculo depende de cookies que
                   caducan: si no se congela hoy, mañana no se puede repetir).
  · deal         — estado actual del deal.
  · deal_etapa   — una fila por cada etapa que se le vio: el embudo del post
                   mortem necesita las transiciones, no solo dónde quedó.
  · gasto_dia    — día × anuncio de Meta. Es lo único de verdad irrecuperable:
                   la API de Meta deja de servir métricas viejas.
  · corte        — el resumen del día, para graficar la evolución.

    python3 ingesta.py                      # ventana de reproceso (7 días)
    python3 ingesta.py --desde 2026-04-01   # backfill
    python3 ingesta.py --solo-brevo

Se llama por API con credencial, nunca por MCP: una rutina desatendida que
llama un conector MCP se cuelga en silencio.
"""

import argparse
import datetime as dt
import json
import os
import pathlib
import sqlite3
import sys
import urllib.parse

import build as b

ROOT = pathlib.Path(__file__).resolve().parent
DB = ROOT / "data" / "tbp-leads.db"

# Meta rechaza rangos largos con desglose por día: el backfill va por tramos.
TRAMO = 60
# Meta reajusta las cifras de los días recientes, así que cada corrida
# reprocesa la última semana en vez de confiar en lo que guardó ayer.
REPROCESO = 7

ESQUEMA = """
CREATE TABLE IF NOT EXISTS lead (
  brevo_id       INTEGER PRIMARY KEY,
  email          TEXT,
  creado_at      TEXT,
  mes            TEXT,
  nombre         TEXT,
  tier           TEXT,
  categoria      TEXT,
  brief          TEXT,
  calidad        TEXT,
  prueba         INTEGER,
  canal          TEXT,
  canal_detalle  TEXT,
  paid           INTEGER,
  primer_contacto TEXT,
  certeza        TEXT,
  asistencias    TEXT,
  landing        TEXT,
  referrer       TEXT,
  ad_name        TEXT,
  form_id        TEXT,
  ga_client_id   TEXT,
  fbc            TEXT,
  fbp            TEXT,
  utm_source     TEXT,
  utm_campaign   TEXT,
  utm_content    TEXT,
  utm_term       TEXT,
  visto_primero  TEXT,
  visto_ultimo   TEXT
);
CREATE INDEX IF NOT EXISTS lead_mes  ON lead(mes);
CREATE INDEX IF NOT EXISTS lead_mail ON lead(email);

CREATE TABLE IF NOT EXISTS deal (
  id             TEXT PRIMARY KEY,
  nombre         TEXT,
  creado_at      TEXT,
  mes            TEXT,
  pipeline       TEXT,
  categoria      TEXT,
  etapa          TEXT,
  contactos      INTEGER,
  notas          TEXT,
  stage_updated_at TEXT,
  visto_primero  TEXT,
  visto_ultimo   TEXT
);
CREATE INDEX IF NOT EXISTS deal_mes ON deal(mes);

CREATE TABLE IF NOT EXISTS deal_etapa (
  deal_id        TEXT,
  etapa          TEXT,
  pipeline       TEXT,
  stage_updated_at TEXT,
  visto_at       TEXT,
  PRIMARY KEY (deal_id, etapa, stage_updated_at)
);

CREATE TABLE IF NOT EXISTS gasto_dia (
  fecha          TEXT,
  ad_id          TEXT,
  ad_name        TEXT,
  adset_name     TEXT,
  campaign_name  TEXT,
  spend          REAL,
  impressions    INTEGER,
  clicks         INTEGER,
  leads          INTEGER,
  actualizado_at TEXT,
  PRIMARY KEY (fecha, ad_id)
);
CREATE INDEX IF NOT EXISTS gasto_fecha ON gasto_dia(fecha);

CREATE TABLE IF NOT EXISTS corte (
  fecha          TEXT PRIMARY KEY,
  mes            TEXT,
  leads          INTEGER,
  con_potencial  INTEGER,
  spend          REAL,
  cpl            REAL,
  deals          INTEGER,
  payload        TEXT
);

CREATE TABLE IF NOT EXISTS ingesta (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  corrio_at      TEXT,
  ok             INTEGER,
  desde          TEXT,
  hasta          TEXT,
  leads_nuevos   INTEGER,
  deals_nuevos   INTEGER,
  cambios_etapa  INTEGER,
  dias_gasto     INTEGER,
  detalle        TEXT
);
"""


def abre():
    DB.parent.mkdir(parents=True, exist_ok=True)
    cx = sqlite3.connect(DB)
    cx.executescript(ESQUEMA)
    # El histórico es el entregable: que un corte a medias no deje la base
    # inservible.
    cx.execute("PRAGMA journal_mode=WAL")
    return cx


def meta_dia_ad(token, account, desde, hasta):
    """Insights de Meta a nivel anuncio y con desglose por día.

    Una fila por día y por anuncio: desde aquí se reconstruye cualquier rango
    sin volver a preguntarle a Meta, que es justo lo que deja de responder
    cuando los datos envejecen.
    """
    campos = ("ad_id,ad_name,adset_name,campaign_name,spend,impressions,clicks,"
              "actions,date_start")
    filas = []
    ini = dt.date.fromisoformat(desde)
    fin = dt.date.fromisoformat(hasta)
    while ini <= fin:
        corte = min(ini + dt.timedelta(days=TRAMO - 1), fin)
        tr = urllib.parse.quote(json.dumps({"since": ini.isoformat(),
                                            "until": corte.isoformat()}))
        url = (f"{b.GRAPH}/{account}/insights?level=ad&time_increment=1"
               f"&time_range={tr}&fields={campos}&limit=500&access_token={token}")
        while url:
            d = b.get(url, {})
            filas += d.get("data") or []
            url = (d.get("paging") or {}).get("next")
        ini = corte + dt.timedelta(days=1)
    return filas


def guarda_leads(cx, contactos, ahora):
    """Upsert de contactos. Devuelve cuántos NO estaban: la bitácora de esta
    rutina ya mintió una vez y un contador inflado es peor que no tenerlo."""
    vistos = {r[0] for r in cx.execute("SELECT brevo_id FROM lead")}
    nuevos = 0
    for c in contactos:
        creado = c.get("createdAt") or ""
        if not creado:
            continue
        a = c.get("attributes", {})
        at = b.atribucion(a, dt.datetime.fromisoformat(creado[:19]))
        fila = (
            c.get("id"), c.get("email"), creado, creado[:7],
            (a.get("NOMBRE") or c.get("email") or "").strip(),
            b.TIERS.get(str(a.get("CATEGORY", "")), "—"),
            str(a.get("CATEGORY", "")),
            str(a.get("TELL_US_ABOUT") or ""),
            b.calidad(c), int(b.es_prueba(c)),
            at["canal"], at["detalle"], int(at["paid"]),
            at["cuando"].isoformat() if at["cuando"] else None,
            at["certeza"], json.dumps(at["asistencias"], ensure_ascii=False),
            str(a.get("LANDING_PAGE") or ""), str(a.get("REFERRER") or ""),
            str(a.get("AD_NAME") or ""), str(a.get("FORM_ID") or ""),
            str(a.get("GA_CLIENT_ID") or ""), str(a.get("FBC") or ""),
            str(a.get("FBP") or ""), str(a.get("UTM_SOURCE") or ""),
            str(a.get("UTM_CAMPAIGN") or ""), str(a.get("UTM_CONTENT") or ""),
            str(a.get("UTM_TERM") or ""), ahora, ahora,
        )
        cx.execute("""
          INSERT INTO lead VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
          ON CONFLICT(brevo_id) DO UPDATE SET
            email=excluded.email, nombre=excluded.nombre, tier=excluded.tier,
            categoria=excluded.categoria, brief=excluded.brief,
            calidad=excluded.calidad, prueba=excluded.prueba,
            canal=excluded.canal, canal_detalle=excluded.canal_detalle,
            paid=excluded.paid, primer_contacto=excluded.primer_contacto,
            certeza=excluded.certeza, asistencias=excluded.asistencias,
            visto_ultimo=excluded.visto_ultimo
        """, fila)
        if c.get("id") not in vistos:
            nuevos += 1
    return nuevos


def guarda_deals(cx, deals, stages, ahora):
    nuevos = cambios = 0
    for d in deals:
        a = d.get("attributes", {})
        creado = a.get("created_at") or ""
        etapa = stages.get(a.get("deal_stage"), "—")
        pipeline = b.PIPELINES.get(a.get("pipeline"), "?")
        sua = (a.get("stage_updated_at") or "")
        fila = (d.get("id"), a.get("deal_name", ""), creado, creado[:7],
                pipeline,
                b.TIERS.get({"sprint": "1", "core": "2", "deep": "3",
                             "brand_applications": "4"}.get(a.get("category"), ""), "—"),
                etapa, a.get("number_of_contacts", 0),
                (a.get("notas") or "").strip(), sua, ahora, ahora)
        antes = cx.execute("SELECT etapa FROM deal WHERE id=?", (d.get("id"),)).fetchone()
        if antes is None:
            nuevos += 1
        elif antes[0] != etapa:
            cambios += 1
        cx.execute("""
          INSERT INTO deal VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
          ON CONFLICT(id) DO UPDATE SET
            nombre=excluded.nombre, pipeline=excluded.pipeline,
            categoria=excluded.categoria, etapa=excluded.etapa,
            contactos=excluded.contactos, notas=excluded.notas,
            stage_updated_at=excluded.stage_updated_at,
            visto_ultimo=excluded.visto_ultimo
        """, fila)
        # La historia del embudo: cada etapa vista queda, no se sobrescribe.
        cx.execute("""
          INSERT OR IGNORE INTO deal_etapa VALUES (?,?,?,?,?)
        """, (d.get("id"), etapa, pipeline, sua, ahora))
    return nuevos, cambios


def guarda_gasto(cx, filas, ahora):
    n = 0
    for r in filas:
        leads = next((int(x["value"]) for x in r.get("actions", [])
                      if x.get("action_type") == "lead"), 0)
        cx.execute("""
          INSERT INTO gasto_dia VALUES (?,?,?,?,?,?,?,?,?,?)
          ON CONFLICT(fecha, ad_id) DO UPDATE SET
            ad_name=excluded.ad_name, adset_name=excluded.adset_name,
            campaign_name=excluded.campaign_name, spend=excluded.spend,
            impressions=excluded.impressions, clicks=excluded.clicks,
            leads=excluded.leads, actualizado_at=excluded.actualizado_at
        """, (r.get("date_start"), r.get("ad_id"), r.get("ad_name", ""),
              r.get("adset_name", ""), r.get("campaign_name", ""),
              float(r.get("spend", 0) or 0), int(r.get("impressions", 0) or 0),
              int(r.get("clicks", 0) or 0), leads, ahora))
        n += 1
    return n


def guarda_corte(cx, mes, hoy):
    """El corte del día, calculado desde lo que ya quedó en la base."""
    leads = cx.execute(
        "SELECT COUNT(*) FROM lead WHERE mes=? AND prueba=0", (mes,)).fetchone()[0]
    buenos = cx.execute(
        "SELECT COUNT(*) FROM lead WHERE mes=? AND prueba=0 AND calidad IN "
        "('Muy buena','Buena')", (mes,)).fetchone()[0]
    g = cx.execute(
        "SELECT COALESCE(SUM(spend),0), COALESCE(SUM(leads),0) FROM gasto_dia "
        "WHERE substr(fecha,1,7)=?", (mes,)).fetchone()
    deals = cx.execute("SELECT COUNT(*) FROM deal WHERE mes=?", (mes,)).fetchone()[0]
    spend, meta_leads = float(g[0]), int(g[1])
    cpl = spend / leads if leads else None
    payload = {"leads": leads, "con_potencial": buenos, "spend": spend,
               "leads_meta": meta_leads, "deals": deals}
    cx.execute("""
      INSERT INTO corte VALUES (?,?,?,?,?,?,?,?)
      ON CONFLICT(fecha) DO UPDATE SET
        leads=excluded.leads, con_potencial=excluded.con_potencial,
        spend=excluded.spend, cpl=excluded.cpl, deals=excluded.deals,
        payload=excluded.payload
    """, (hoy.isoformat(), mes, leads, buenos, spend, cpl, deals,
          json.dumps(payload, ensure_ascii=False)))
    return payload


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--desde", default=None,
                    help="YYYY-MM-DD para backfill de Meta (por defecto, 7 días)")
    ap.add_argument("--hasta", default=None)
    ap.add_argument("--solo-brevo", action="store_true")
    args = ap.parse_args()

    b.load_env()
    hoy = dt.date.today()
    ahora = dt.datetime.now().isoformat(timespec="seconds")
    mes = hoy.strftime("%Y-%m")
    desde = args.desde or (hoy - dt.timedelta(days=REPROCESO)).isoformat()
    hasta = args.hasta or hoy.isoformat()

    cx = abre()
    leads_n = deals_n = cambios = dias = 0
    detalle = "ok"
    try:
        key = os.environ["BREVO_API_KEY"]
        contactos, deals_raw, stages = b.fetch_brevo(key, mes)
        leads_n = guarda_leads(cx, contactos, ahora)
        deals_n, cambios = guarda_deals(cx, deals_raw, stages, ahora)

        if not args.solo_brevo:
            filas = meta_dia_ad(os.environ["META_TOKEN_TBP"],
                                os.environ["META_ACCOUNT_TBP"], desde, hasta)
            dias = guarda_gasto(cx, filas, ahora)

        corte = guarda_corte(cx, mes, hoy)
        cx.commit()
    except Exception as ex:                     # noqa: BLE001 - se registra y se grita
        cx.rollback()
        detalle = f"{type(ex).__name__}: {ex}"
        cx.execute("INSERT INTO ingesta (corrio_at,ok,desde,hasta,leads_nuevos,"
                   "deals_nuevos,cambios_etapa,dias_gasto,detalle) "
                   "VALUES (?,0,?,?,?,?,?,?,?)",
                   (ahora, desde, hasta, leads_n, deals_n, cambios, dias, detalle))
        cx.commit()
        print(json.dumps({"ok": False, "detalle": detalle}, ensure_ascii=False))
        sys.exit(1)

    cx.execute("INSERT INTO ingesta (corrio_at,ok,desde,hasta,leads_nuevos,"
               "deals_nuevos,cambios_etapa,dias_gasto,detalle) "
               "VALUES (?,1,?,?,?,?,?,?,?)",
               (ahora, desde, hasta, leads_n, deals_n, cambios, dias, detalle))
    cx.commit()

    tot = {t: cx.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
           for t in ("lead", "deal", "deal_etapa", "gasto_dia", "corte")}
    print(json.dumps({"ok": True, "corrio": ahora, "ventana": [desde, hasta],
                      "deals_nuevos": deals_n, "cambios_etapa": cambios,
                      "filas_gasto_tocadas": dias, "corte": corte,
                      "acumulado": tot, "db": str(DB)},
                     ensure_ascii=False, indent=1))
    cx.close()


if __name__ == "__main__":
    main()
