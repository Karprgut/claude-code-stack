# Instrucciones globales (se cargan en toda sesión)

Mantén este archivo MÍNIMO. Se inyecta en cada conversación sin importar el cwd. Lo específico
de un cliente o de un flujo va en `~/Hub/` o en el `CLAUDE.md` del repo correspondiente.

## Identidad
- Usuario: <Tu Nombre> · `tu-cuenta@tu-dominio.com`
- Opera **<Tu empresa>** (<dominio>) — <una línea de qué hace>
- Trabaja varios proyectos de clientes e internos en paralelo

## Idioma
- Responde en **español mexicano** (tú)
- Evita el voseo argentino y las formas ibéricas

## Hub de proyectos
El mapa completo de clientes y proyectos vive en `~/Hub/`. Cuando el usuario mencione un
cliente por nombre y necesites orientarte (ruta del repo, stack, estado), lee:
- `~/Hub/projects.md` — índice único de verdad
- `~/Hub/clients/<cliente>.md` — brief por cliente

Cuando el usuario quiera trabajar SOBRE un cliente, prefiere hacer `cd` a su repo antes de
tocar nada: así la memoria por proyecto se queda limpia y no se cruza entre clientes.

## Referencias transversales
- Deploys: Vercel con el handle `<tu-handle-de-vercel>` (`npx vercel`)
- Identidad visual: <una línea sobre tu sistema de diseño>

## Compuerta de tema
Si el usuario menciona un cliente (<lista de clientes>) desde un cwd que NO le pertenece,
dilo una vez y ofrece `cd` al repo correcto. Esto evita el patrón de contaminación cruzada
que ya ocurrió (memorias de un cliente terminando en el proyecto de otro).
