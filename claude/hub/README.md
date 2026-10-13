# Hub: el router de proyectos

`~/Hub/` es un **índice**, no un workspace. El código vive en el repo de cada cliente. El Hub
existe para:

1. Darle a una sesión nueva el mapa completo del portafolio en 30 segundos.
2. Evitar contaminación cruzada entre las memorias por proyecto.
3. Ser el único lugar que actualizas cuando un repo se mueve, cambia un stack o entra un cliente.
4. Guardar la **bitácora de conversaciones**, lo único consultable desde cualquier cwd.

## Archivos

| Archivo | Qué es |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Lo que Claude lee al arrancar desde `~/Hub`: mapa + reglas de operación |
| [`projects.md`](projects.md) | El índice detallado: remotes, ramas, directorios de memoria, deuda pendiente |
| [`clients/_plantilla.md`](clients/_plantilla.md) | Brief por cliente: hoja de punteros, no documentación duplicada |
| `bitacora/*.md` | Registro destilado de todas las sesiones de Claude Code en disco (se genera) |
| [`tools/`](tools/) | Los tres scripts que generan la bitácora |
| `secrets.md` | Mapa cruzado de variables de entorno: nombres y hashes, **sin valores** (ver [../secretos/](../secretos/)) |

## Cuándo usarlo

- **Sí:** planeando entre clientes, decidiendo qué tocar, poniéndote al día después de una pausa,
  reconstruyendo por qué algo quedó como quedó, dando de alta una herramienta que aplica a todos.
- **No:** para implementar. `cd` al repo del cliente para que la memoria se acumule donde va.

## Reglas de operación (las que están en el `CLAUDE.md` del Hub)

1. **`cd` primero, luego trabaja.** La memoria está indexada por cwd.
2. **Las ediciones del Hub se quedan en el Hub.** Lo de nivel portafolio (cambió el stack, se
   movió el repo, cambió un contacto) va a `clients/<cliente>.md`. Los detalles de implementación
   van a la memoria del repo.
3. **No dupliques.** Si un dato ya vive en un archivo de memoria, apunta a él desde el brief.
4. **Verifica antes de afirmar.** El índice estuvo tres meses desactualizado y afirmaba una ruta
   que ya no existía. Si vas a citar una ruta o un remote, confírmalo contra el disco.
5. **Separación de marcas.** Si operas más de una marca, el Hub dice cuál firma qué.
6. **Los secretos se renuevan en el vault, no en el `.env`.**

## La bitácora de conversaciones

Claude Code **borra transcripts viejos** por retención. Entre dos corridas con minutos de
diferencia desaparecieron tres `.jsonl` del disco. La bitácora es el destilado de todas las
sesiones (solo los prompts del usuario, hasta 14 por sesión, 300 caracteres cada uno) agrupadas
por workspace y ordenadas por fecha, con credenciales redactadas antes de tocar disco.

```bash
node tools/distill.mjs /tmp/b-nuevo.json       # lee todos los .jsonl → JSON intermedio
node tools/merge.mjs                           # rescata sesiones que ya no existen en disco
node tools/render.mjs /tmp/b-nuevo.json ~/Hub/bitacora
```

`merge.mjs` espera `bitacora.json` (corrida vieja) y `bitacora2.json` (corrida nueva) en el cwd.
`render.mjs` sobrescribe el archivo completo, incluido el encabezado curado: cópialo antes.
Para agregar un workspace, edita `GROUPS` en `render.mjs`. **Guarda el JSON intermedio de cada
corrida**: es la única copia de las sesiones que Claude ya borró.

`distill.mjs` redacta: lo que siga a "pass/contraseña/token/secret/api key", client secrets de
Google OAuth y llaves con prefijo conocido (`sk-`, `ghp_`, `xox*-`, `AKIA`, `Bearer`). Agrega
los patrones propios de tu equipo a `redact()`; la primera corrida mía sí filtró tres
contraseñas en claro.
