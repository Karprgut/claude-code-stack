# -*- coding: utf-8 -*-
INK="#0A0A0A"; GRN="#12B76A"; BLU="#2D5BFF"; GREY="#8A8A8A"; AMB="#FFB000"
F="font-family='Space Grotesk,Inter,sans-serif'"; M="font-family='IBM Plex Mono,monospace'"
DEFS=(f'<defs><marker id="fa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" '
      f'orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="{INK}"/></marker></defs>')
def box(x,y,w,h,fill="#fff",stroke=INK,sw=3,r=4):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'
def t(x,y,s,size=14,w=600,fill=INK,anchor="start",mono=False):
    return f'<text x="{x}" y="{y}" {M if mono else F} font-size="{size}" font-weight="{w}" fill="{fill}" text-anchor="{anchor}">{s}</text>'
def arr(x1,y1,x2,y2,col=INK):
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{col}" stroke-width="3" marker-end="url(#fa)"/>'

def arquitectura():
    s=[f'<svg viewBox="0 0 1040 430" role="img" aria-label="Arquitectura de Flint">',DEFS]
    # fuentes
    s.append(t(14,28,'ENTRADAS',12,700,GREY))
    fuentes=[("Meta Marketing API","campañas e inversión"),("Google Ads API","campañas e inversión"),
             ("TikTok Marketing API","campañas e inversión"),("Feeds ICS","Google · Apple · Outlook"),
             ("Texto plano","“dos huevos y pan tostado”")]
    y=44
    for a,b in fuentes:
        s.append(box(14,y,236,52))
        s.append(t(30,y+24,a,12.5,700)); s.append(t(30,y+42,b,10.5,500,GREY))
        y+=62
    # ingesta
    s.append(box(292,96,166,216,"#F7F7F7"))
    s.append(t(310,126,'INGESTA',13,700))
    s.append(t(310,152,'cron 2× al día',11,500,GREY,mono=True))
    s.append(t(310,172,'sync de agenda',11,500,GREY,mono=True))
    s.append(t(310,192,'por hora',11,500,GREY,mono=True))
    s.append(t(310,224,'estimación de',11,500,GREY))
    s.append(t(310,240,'macros con IA',11,500,GREY))
    s.append(t(310,276,'alertas 80% / 100%',11,600,AMB,mono=True))
    # mongo
    s.append(box(500,120,180,168,"#F0FFF4",GRN,3))
    s.append(t(590,158,'MongoDB',17,700,anchor="middle"))
    s.append(t(590,180,'Atlas',12,500,GREY,anchor="middle"))
    s.append(t(590,214,'una colección',11.5,500,GREY,anchor="middle"))
    s.append(t(590,232,'por dominio',11.5,500,GREY,anchor="middle"))
    s.append(t(590,264,'esquema documentado',10.5,600,GRN,anchor="middle"))
    # salidas
    s.append(t(722,28,'SUPERFICIES',12,700,GREY))
    sal=[("Tablero web","Next.js · React · gráficas",78),
         ("App iOS","Swift nativo · SwiftUI",148),
         ("Agente de terminal","lee, escribe y consulta",218),
         ("Chat multi-proveedor","con uso de herramientas",288)]
    for a,b,yy in sal:
        s.append(box(722,yy,304,56,"#fff"))
        s.append(t(742,yy+26,a,13.5,700)); s.append(t(742,yy+44,b,11,500,GREY))
    s.append(arr(254,196,288,196))
    s.append(arr(462,204,496,204))
    for yy in [106,176,246,316]: s.append(arr(684,204,718,yy) if yy!=204 else arr(684,204,718,204))
    # memoria compartida
    s.append(box(500,332,526,60,"#111",INK))
    s.append(t(522,358,'MEMORIA COMPARTIDA DE IA',12,700,AMB))
    s.append(t(522,380,'lo que aprende un proveedor queda disponible para los demás',11.5,500,'#bbb'))
    s.append(f'<line x1="590" y1="292" x2="590" y2="328" stroke="{INK}" stroke-width="3" marker-end="url(#fa)"/>')
    s.append('</svg>')
    return "".join(s)
