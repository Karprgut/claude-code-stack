// ─────────────────────────────────────────────────────────────────
// Genera el GOOGLE_ADS_REFRESH_TOKEN una sola vez.
//
//   1) En Google Cloud Console crea un "OAuth client ID" tipo
//      "Web application" y agrega esta URI de redirección autorizada:
//          http://localhost:3000/oauth2callback
//   2) Pon CLIENT_ID y CLIENT_SECRET en tu .env
//   3) Corre:  node get-refresh-token.mjs
//   4) Abre la URL que imprime, inicia sesión con
//      tu-cuenta@tu-dominio.com y acepta.
//   5) Copia el refresh_token impreso a GOOGLE_ADS_REFRESH_TOKEN en .env
// ─────────────────────────────────────────────────────────────────
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { OAuth2Client } from 'google-auth-library';

// Mini-loader de .env sin dependencias
function loadEnv() {
  try {
    for (const line of readFileSync(new URL('.env', import.meta.url), 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch { /* sin .env todavía */ }
}
loadEnv();

const CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET;
const REDIRECT = 'http://localhost:3000/oauth2callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('✗ Falta GOOGLE_ADS_CLIENT_ID o GOOGLE_ADS_CLIENT_SECRET en .env');
  process.exit(1);
}

const oauth2 = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT);
const authUrl = oauth2.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent', // fuerza a que devuelva refresh_token
  scope: ['https://www.googleapis.com/auth/adwords'],
});

const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith('/oauth2callback')) { res.end('ok'); return; }
  const code = new URL(req.url, REDIRECT).searchParams.get('code');
  try {
    const { tokens } = await oauth2.getToken(code);
    res.end('Listo. Ya puedes cerrar esta pestaña y volver a la terminal.');
    console.log('\n✅ REFRESH TOKEN (cópialo a .env → GOOGLE_ADS_REFRESH_TOKEN):\n');
    console.log(tokens.refresh_token, '\n');
  } catch (e) {
    res.end('Error al intercambiar el código: ' + e.message);
    console.error(e);
  } finally {
    server.close();
  }
});

server.listen(3000, () => {
  console.log('\nAbre esta URL en tu navegador (sesión de tu-cuenta@tu-dominio.com):\n');
  console.log(authUrl, '\n');
});
