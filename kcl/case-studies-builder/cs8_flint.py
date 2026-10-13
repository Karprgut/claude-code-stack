# -*- coding: utf-8 -*-
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build import write
import svg_flint as G
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "flint-case-study")

cfg = dict(
  ns="flcs", accent="#12B76A", accent2="#2D5BFF", tag="Case Study · Producto propio",
  title="Flint — el centro de mando que reemplazó quince hojas de cálculo",
  desc="Producto propio: tablero web, app de iOS y agente de terminal sobre una sola base de datos, que integra campañas de Meta, Google y TikTok con operación, personas y salud.",
  footright="Proyecto propio · Karma Creative Lab",
  sections=[
    dict(t="hero", eyebrow="Producto propio · Next.js + iOS",
      h1=["Flint:","el centro de mando","que <em>reemplazó</em> quince hojas."],
      dek=("Quien opera varias cuentas a la vez lleva la mitad del trabajo en la cabeza y la otra mitad en hojas de "
           "cálculo que nadie más entiende. Flint es el producto que construí para salir de ahí: "
           "<strong>una sola base de datos</strong> donde caben las campañas de tres plataformas, los pendientes, "
           "la agenda, el estado de cada cliente y la salud — con <strong>tres superficies</strong> encima: tablero "
           "web, app de iOS y un agente que se opera escribiendo."),
      meta=[("Proyecto","Flint"),("Tipo","Producto propio"),("Rol","Producto e ingeniería"),
            ("Stack","Next.js · Swift · MongoDB"),("Infra","AWS con Terraform")]),

    dict(t="sec", num="01", h2="Por qué existe", narrow=True,
      lead=("El problema no era que faltara una herramienta. Era que sobraban: una para pendientes, otra para "
            "métricas, otra para campañas, tres hojas para presupuesto, y la agenda en un cuarto lugar."),
      ps=["Cada herramienta resolvía bien su rebanada y ninguna podía contestar la única pregunta que importa un "
          "lunes: <strong>¿cómo voy?</strong> Esa pregunta cruza dominios — pacing de campañas, pendientes "
          "atrasados, con quién no he hablado, cuánto dormí. Ningún producto del mercado cruza esos dominios porque "
          "ninguno tendría por qué hacerlo.",
          "La decisión de arquitectura fue tratar todo como el mismo problema de datos: una colección por dominio en "
          "la misma base, con el esquema escrito y versionado. A partir de ahí, cada superficie es sólo una forma de "
          "mirar lo mismo."]),
    dict(t="divider"),

    dict(t="sec", num="02", h2="Cómo está armado",
      lead=("Las entradas se ingieren solas. La base es una. Las superficies son tres, y ninguna es la principal — "
            "cada una gana en un contexto distinto."),
      children=[dict(t="diagram", svg=G.arquitectura(),
        cap="Las campañas entran dos veces al día por las APIs nativas; la agenda cada hora; las comidas se capturan en texto plano y se estiman al vuelo.")],
      ps=["El cambio que más rindió fue dejar de raspar exportaciones y pasar a las <strong>APIs nativas</strong> de "
          "Meta, Google Ads y TikTok. Una exportación a mano puede verse completa y no estarlo; la API con ventana "
          "cerrada devuelve siempre lo mismo."]),

    dict(t="sec", num="03", h2="El tablero",
      lead=("La portada contesta “¿cómo voy?” en una pantalla: próximos eventos, foco del día, pacing de cada "
            "cuenta, macros, y el estado de salud de la semana."),
      children=[dict(t="shot", url="flint · overview", img="flint-01-overview.jpg", tall=True,
             alt="Portada del tablero de Flint")],
      ps=["Las barras de pacing del encabezado son la parte más usada del producto: cada cuenta con lo gastado contra su "
          "presupuesto del mes y el porcentaje esperado a esa altura. Cuando una cruza el 80% antes de tiempo, "
          "avisa sola."]),

    dict(t="sec", num="04", h2="Operación",
      lead=("Pendientes con proyecto y prioridad, contador de cuántas veces se ha empujado cada uno —que es el dato "
            "que delata lo que no se va a hacer nunca—, y la agenda con los calendarios externos ya sincronizados."),
      children=[dict(t="shots2", items=[
        dict(url="flint · todo", img="flint-02-todo.jpg", alt="Lista de pendientes", cap="Pendientes", capsub="por proyecto, con conteo de empujones"),
        dict(url="flint · calendar", img="flint-03-calendar.jpg", alt="Calendario", cap="Agenda", capsub="feeds ICS de tres calendarios")])]),

    dict(t="sec", num="05", h2="Clientes y personas",
      lead=("Dos módulos que miden lo que normalmente se opina. El de clientes evalúa la relación —pago, "
            "capacidad de respuesta, calidad del brief, previsibilidad—. El de personas evalúa desempeño por "
            "dimensiones, con la razón escrita al lado de cada calificación."),
      children=[dict(t="shots2", items=[
        dict(url="flint · client-health", img="flint-04-clientes.jpg", alt="Salud de clientes", cap="Salud de clientes", capsub="la relación, no sólo la facturación"),
        dict(url="flint · people", img="flint-05-personas.jpg", alt="Evaluación de personas", cap="Personas", capsub="con traza de evidencia por dimensión")]),
        dict(t="note", html=("<b>La parte incómoda, y la razón de que exista.</b> Calificar a una persona sin "
             "escribir por qué es una opinión con número. El módulo obliga a dejar el razonamiento junto a la "
             "calificación, e incluye revisiones explícitas de sesgo. Es lo que separa una evaluación de un "
             "recuerdo selectivo."))]),

    dict(t="sec", num="06", h2="Métricas y bienestar",
      lead=("Series diarias y semanales de todo lo que el sistema registra, y el módulo de bienestar: macros, "
            "sueño, ánimo y actividad, con el mapa de calor anual de salud."),
      children=[dict(t="shots2", items=[
        dict(url="flint · metrics", img="flint-06-metricas.jpg", alt="Métricas", cap="Métricas", capsub="tendencia diaria y semanal"),
        dict(url="flint · wellness", img="flint-07-wellness.jpg", alt="Bienestar", cap="Bienestar", capsub="macros, sueño y ánimo")]),
        dict(t="note", html=("<b>Por qué la salud vive en la misma base que las campañas.</b> Porque la correlación "
             "existe y sin los dos lados no se ve. Un mes de pacing perfecto que coincide con cuatro horas de sueño "
             "al día no es un mes bueno — es una factura que se paga después."))]),

    dict(t="sec", num="07", h2="La capa de IA",
      lead=("Chat de varios proveedores dentro del tablero, con acceso a herramientas: puede leer archivos, "
            "consultar la base y mover pendientes. Arriba de eso, dos cosas que casi nadie construye — memoria "
            "compartida entre proveedores, y control de costo."),
      children=[dict(t="shots2", items=[
        dict(url="flint · chat", img="flint-09-chat.jpg", alt="Chat con herramientas", cap="Chat", capsub="varios proveedores, con uso de herramientas"),
        dict(url="flint · ai-costs", img="flint-08-ai.jpg", alt="Costos de IA", cap="Costo", capsub="por modelo, por día")]),
        dict(t="shot", url="flint · summaries", img="flint-10-resumenes.jpg",
             alt="Resúmenes diarios", cap="Resúmenes", capsub="cierre del día y del viernes, generados sobre lo que el sistema ya sabe")],
      ps=["La memoria compartida es la pieza que hace que valga la pena tener varios modelos: lo que aprende uno "
          "queda disponible para los demás, así que cambiar de proveedor no significa volver a explicar el contexto.",
          "El control de costo existe por la razón obvia: un producto con IA embebida y sin medición de gasto se "
          "vuelve caro sin que nadie se dé cuenta hasta el corte."]),
    dict(t="divider"),

    dict(t="sec", num="08", h2="Bajo el cofre", narrow=True,
      children=[dict(t="cards", items=[
        ("Next.js 15 · React 19","Tablero web con Tailwind, gráficas y revalidación en cliente. Todas las vistas leen de la misma capa de datos."),
        ("iOS nativo en Swift","App propia en SwiftUI para la captura del día: comidas, ánimo y sueño se registran donde se está, no frente a la computadora."),
        ("MongoDB Atlas","Una colección por dominio, con el esquema escrito en el repositorio. Es la regla que mantiene el producto extensible."),
        ("Agente de terminal","La tercera superficie: se opera escribiendo. Muchos registros son más rápidos así que con un formulario."),
        ("AWS con Terraform","Infraestructura declarada: cómputo, balanceador y registro de imágenes. Levantar otra instancia es un comando."),
        ("Integración continua","Despliegue automatizado desde el repositorio y crons de ingesta con horario fijo.")]),
        dict(t="note", html=("<b>Las capturas de este caso corren sobre una base sembrada con datos ficticios.</b> "
             "Botánica, Helia y Nodo no son clientes, y las personas que aparecen en el módulo de evaluación no "
             "existen. El producto es el real; los datos no."))]),

    dict(t="closing",
      callout=("La pregunta que ninguna herramienta del mercado podía contestar era la más simple: <b>¿cómo voy?</b> "
               "No la contestaba nadie porque la respuesta cruza dominios que ningún producto junta."),
      stats=[("3","superficies sobre una base"),("3","plataformas de medios ingeridas"),("2×","sincronización diaria de campañas"),("1","esquema documentado")]),
  ])
print(write(cfg,OUT))
