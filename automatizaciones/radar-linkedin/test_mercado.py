#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Bateria del detector de mercado.  python3 test_mercado.py"""
import importlib.util, os, sys
B=os.path.dirname(os.path.abspath(__file__))
spec=importlib.util.spec_from_file_location("radar", os.path.join(B,"radar.py"))
r=importlib.util.module_from_spec(spec); spec.loader.exec_module(r)

CASOS=[
 ("Agencia en CDMX","Busco agencia digital","Busco agencia digital con oficina en Ciudad de Mexico para llevar la pauta.","MX"),
 ("Monterrey","Busco agencia de desarrollo web","Busco agencia con enfoque en SEO y conversion, de preferencia en Monterrey.","MX"),
 ("Colombia","Agencia de social paid media","ePayco esta buscando una agencia super pro para social paid media en Bogota.","CO"),
 ("Peru","Agencia para campanas digitales","En Caja Cusco buscamos una agencia con experiencia en campanas digitales en Lima.","PE"),
 ("Estados Unidos","Looking for a digital marketing agency","Looking for an agency with experience in US P&C Insurance. Must generate qualified US B2B leads.","US"),
 ("Espana se descarta","Buscamos agencia","Buscamos agencia de social media para nuestra marca en Madrid, Espana.","fuera"),
 ("Argentina se descarta","Busco una agencia de marketing argentina","Durante varios anos me encargue yo de todo. Busco agencia en Buenos Aires.","fuera"),
 ("India se descarta","Looking for a Marketing Agency","We are looking for a performance-driven marketing agency for our app Made in India.","fuera"),
 ("Centroamerica se descarta","Estoy buscando una Agencia","Buscamos agencia para El Salvador, Guatemala, Honduras y Panama.","fuera"),
 ("Sin pais declarado","Looking for a social media agency","We are currently looking for a Social Media Agency on a retainer basis for one of our brands.",""),
]
fallas=0
for nombre,tit,txt,esp in CASOS:
    got=r.mercado(tit,txt)
    ok=(got==esp)
    if not ok: fallas+=1
    print("%s %-6s esperado %-6s  %s" % ("OK   " if ok else "FALLA", got or "''", esp or "''", nombre))
print("\n%d/%d" % (len(CASOS)-fallas, len(CASOS)))
sys.exit(1 if fallas else 0)
