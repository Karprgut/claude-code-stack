# Discovery Brief — E-commerce | Lado N

Formulario público para que clientes potenciales completen el brief de discovery del desarrollo de un e-commerce. Al enviar, se genera un PDF con todas las respuestas y se abre el cliente de correo con un mailto a `tu-cuenta@tu-dominio.com`.

## Stack

- Next.js 15 (App Router) + React + TypeScript
- Tailwind CSS
- jsPDF (generación de PDF client-side, sin backend)

## Cómo funciona el envío

1. El usuario completa el formulario.
2. Al hacer clic en **Enviar brief**, el navegador:
   - Genera un PDF con todas las respuestas (descarga local).
   - Abre `mailto:tu-cuenta@tu-dominio.com` con asunto y cuerpo prellenados.
3. El usuario adjunta el PDF descargado al correo y lo envía.

No hay backend ni base de datos: todo el procesamiento es en el navegador.

## Desarrollo local

```bash
npm install
npm run dev
```

Abrir http://localhost:3000.

## Deploy a Vercel

```bash
# Opción A: CLI
npm i -g vercel
vercel

# Opción B: GitHub
# 1. Push del repo a GitHub
# 2. Importar en https://vercel.com/new
# 3. Vercel detecta Next.js automáticamente, deploy con defaults
```

No requiere variables de entorno.

## Personalización rápida

- **Preguntas:** `app/questions.ts`
- **Estilo del PDF:** `app/generatePDF.ts`
- **Email destino:** buscar `tu-cuenta@tu-dominio.com` en `app/generatePDF.ts` y `app/DiscoveryForm.tsx`.
- **Paleta de colores:** `tailwind.config.ts`
