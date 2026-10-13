#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Bateria del clasificador. Casos tomados de posteos reales verificados a mano.
Correr despues de tocar las senales:  python3 test.py"""
import importlib.util, os, sys
B = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("radar", os.path.join(B, "radar.py"))
r = importlib.util.module_from_spec(spec); spec.loader.exec_module(r)

CASOS = [
 ("K-Media busca cofundador", "We're Looking for a Co-Founder at K-Media",
  "I'm not looking for an employee. I'm looking for someone who wants to build something from zero. K-Media is building beyond a traditional digital marketing agency. We're now looking for a Co-Founder / Founding Partner. Strong entrepreneurial mindset, sales experience.", False),
 ("Adolfo · agencia de influencers", "Buscamos agencia de influencer mkt.",
  "Hola comunidad, estoy buscando una agencia de influencers ya que quiero posicionar un sitio web de exportaciones. Busco agencias que tengan talentos de YouTube, IG y Tik Tok.", True),
 ("Ethan Cohen · CPG sin IA", "crowdsourcing some recommendations: who are the best digital agencies making the best CPG paid ad content that is NOT made via AI?",
  "crowdsourcing some recommendations: who are the best digital agencies making the best CPG paid ad content that is NOT made via AI? intros in comments or DM me", True),
 ("Auditoria pagada SIN agencia (ahora fuera: es persona)", "Who do I know that's a Meta Ads / Paid Media savage?",
  "Looking for someone to do an account review / audit. Will pay for the time. Needs to be someone that has scaled beyond $3k/day for B2B lead gen.", False),
 ("Solo freelance, sin agencia", "Busco freelance para llevar mis redes",
  "Busco un freelance que me lleve las redes sociales de mi negocio. Pago mensual. Mandenme portafolio por mensaje.", False),
 ("Agencia O freelance (acepta agencia)", "Busco un megamago en performance para e-commerce",
  "Puede ser agencia o freelancer. Necesito a alguien que sepa de Meta Ads, Google Ads, CRO, analytics y escalamiento para mi tienda en Mexico.", True),
 ("Vacante clasica", "Estamos buscando Community Manager Jr.",
  "Vacante: Community Manager Jr. Lugar: Anzures CDMX. Horario tiempo completo. Sueldo competitivo, prestaciones de ley. Envia tu CV.", False),
 ("Agencia promocionandose", "Una agencia que no aplica su metodo a si misma",
  "Somos una agencia de mercadotecnia y publicidad. Te ayudamos a crecer. Agenda una llamada y conoce a nuestros clientes.", False),
 ("RFP formal", "Convocatoria abierta | RFP - Agencias de Contenido",
  "Abrimos convocatoria para RFP. Buscamos agencia de contenido e implementacion. Las agencias interesadas pueden registrarse.", True),
 ("Vacante disfrazada de partner", "Buscamos Media Buyer para sumarse al equipo",
  "Buscamos un/a especialista en paid media para sumarse a nuestro equipo. Modalidad hibrida, prestaciones superiores, postulate en el link.", False),
 ("Base de proveedores UGC", "Busco agencias UGC para base de proveedores 2026",
  "Estoy integrando mi base de proveedores 2026 y busco agencias de UGC con talento propio.", True),
 # --- ruido real que trajo la fuente en ingles (6-oct) ---
 ("Agencia anunciando que crece", "Hey network! We're growing at Hummingbird Creative Group",
  "Hey network! We're growing at Hummingbird Creative Group and looking to add talent to our agency team.", False),
 ("Opinion sobre RFPs", "I've been on the answering end of RFPs for 30 years",
  "I've been on the answering end of RFPs for 30 years. Here is what buyers get wrong about agency selection.", False),
 ("Vacante que menciona agencias", "We're hiring! Looking for a Senior Manager, Paid Media",
  "We're hiring! Looking for a Senior Manager, Paid Media & Affiliate Marketing to join our team. Our agency partners support us.", False),
 ("Consultoria dirigida a agencias", "Your Agency Doesn't Need a Better Pitch",
  "Your agency doesn't need a better pitch. It needs a better process for winning clients.", False),
 ("Vacante de manager", "We're looking for a Digital Marketing Manager to join",
  "We're looking for a Digital Marketing Manager to join our team. We work with an agency on paid.", False),
 ("Opinion de social media", "My spicy social media take",
  "My spicy social media take: to be really good at social you need to have worked at an agency.", False),
 ("Hashtag parte la frase", "Looking to #hire a marketing agency or freelancer",
  "Looking to #hire a marketing agency or freelancer that is AI-savvy for TARN. Comment or DM me.", True),
 ("Agencia digital sin la palabra marketing", "CONVOCATORIA BUSCAMOS AGENCIA DIGITAL",
  "Una institucion de educacion superior se encuentra en busqueda de una agencia digital estrategica.", True),
 ("Partner de paid media", "Hi LinkedIn! I'm looking for a partner",
  "I'm looking for a partner, an agency or independent, to take on our paid media and help us scale it properly. Meta and email are our primary channels.", True),
]

fallas = 0
for nombre, tit, txt, esperado in CASOS:
    tipo, score = r.clasifica(tit, txt)
    acerto = (tipo == "DEMANDA") == esperado
    if not acerto: fallas += 1
    print("%s %-9s (%d)  %s" % ("OK   " if acerto else "FALLA", tipo, score, nombre))
print("\n%d/%d" % (len(CASOS) - fallas, len(CASOS)))
sys.exit(1 if fallas else 0)
