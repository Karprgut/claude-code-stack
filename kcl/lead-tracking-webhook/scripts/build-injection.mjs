/* ============================================================
   Regenera public/form-injection.js a partir de brevo-form-tbp.html
   ────────────────────────────────────────────────────────────
   El form vive embebido como string (TBP_FORM_HTML) dentro del
   inyector. Antes se mantenía a mano; este script reemplaza SOLO
   esa línea con el HTML actualizado (escapado con JSON.stringify),
   conservando intacta toda la lógica de inyección.

   Uso:  node scripts/build-injection.mjs   (o  npm run build)
   ============================================================ */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const htmlPath = join(root, "brevo-form-tbp.html");
const injPath = join(root, "public", "form-injection.js");

const html = readFileSync(htmlPath, "utf8");
const lines = readFileSync(injPath, "utf8").split("\n");

const idx = lines.findIndex((l) => l.trimStart().startsWith("var TBP_FORM_HTML = "));
if (idx === -1) {
  console.error("ERROR: no se encontró la línea 'var TBP_FORM_HTML = ' en form-injection.js");
  process.exit(1);
}

const indent = lines[idx].match(/^\s*/)[0];
lines[idx] = `${indent}var TBP_FORM_HTML = ${JSON.stringify(html)};`;

writeFileSync(injPath, lines.join("\n"));
console.log(`✓ form-injection.js regenerado · HTML embebido: ${html.length} bytes (línea ${idx + 1})`);
