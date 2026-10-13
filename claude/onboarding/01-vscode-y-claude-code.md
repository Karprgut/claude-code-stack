# 1 · Visual Studio Code + Claude Code

Claude Code es la herramienta con la que trabajo. Corre dentro de VS Code como una extensión (un panel de chat lateral) y también desde la terminal. Esta guía te deja lista la versión de VS Code.

---

## 1.1 Instalar Visual Studio Code

1. Descarga VS Code: https://code.visualstudio.com/
2. En Mac: abre el `.zip`, arrastra **Visual Studio Code** a la carpeta **Aplicaciones**.
3. Ábrelo una vez para que macOS lo autorice.

**Recomendado** — instalar el comando `code` en la terminal:
- En VS Code abre la paleta de comandos: `Cmd + Shift + P`
- Escribe **Shell Command: Install 'code' command in PATH** y dale Enter.
- Así puedes abrir cualquier carpeta con `code .` desde la terminal.

## 1.2 Instalar la extensión Claude Code

1. En VS Code abre el panel de **Extensiones** (`Cmd + Shift + X`).
2. Busca **Claude Code** (publicada por Anthropic).
3. Click en **Install**.
4. Aparecerá un ícono de Claude en la barra lateral izquierda. Ábrelo.

> Alternativa por terminal (opcional): `npm install -g @anthropic-ai/claude-code` y luego el comando `claude`. La extensión de VS Code es lo más cómodo para empezar.

## 1.3 Iniciar sesión

1. En el panel de Claude Code, click en **Sign in**.
2. Se abre el navegador → inicia sesión con tu cuenta de **Anthropic / Claude**.
   - Si vas a usar el plan de la agencia, pídeme la invitación al workspace de facturación antes de este paso.
3. Vuelve a VS Code; ya deberías ver el chat listo.

## 1.4 Conceptos mínimos para no perderte

| Concepto | Qué es |
|---|---|
| **Carpeta de trabajo (workspace)** | La carpeta que abres en VS Code (`File → Open Folder`). Claude trabaja sobre lo que esté ahí. Para cada cliente abrimos SU carpeta. |
| **CLAUDE.md** | Archivo de instrucciones que Claude lee automáticamente. Hay uno global (mis reglas) y uno por proyecto. No lo borres. |
| **Skill** | Una "receta" o capacidad extra que Claude carga sola cuando la necesita (ej. armar un post-mortem). Ver guía 02. |
| **MCP** | Un conector a un servicio externo (Gmail, Meta, Brevo…). Ver guía 03. |
| **Modo de permisos** | Claude pide permiso antes de ejecutar comandos o tocar archivos. Puedes aprobar uno a uno o darle permiso permanente a comandos seguros. |
| **`/comando`** | Escribir `/` en el chat lista comandos y skills disponibles. Ej. `/post-mortem`, `/code-review`. |

## 1.5 Atajos útiles dentro de Claude Code

- `Esc` — interrumpe a Claude a media tarea.
- `/clear` — limpia el contexto de la conversación (empezar de cero sin cerrar).
- `/help` — ayuda de la herramienta.
- `@archivo` — referencia un archivo específico para que lo lea.
- Arrastrar una imagen al chat — Claude la puede ver (útil para diseño/refs).

## ✅ Checklist antes de pasar a la guía 02

- [ ] VS Code instalado y abriendo carpetas.
- [ ] Extensión Claude Code instalada.
- [ ] Sesión iniciada (ves el chat).
- [ ] Entiendes qué es la carpeta de trabajo y el CLAUDE.md.
