// Prueba que las credenciales funcionan: lista cuentas accesibles
// y consulta datos básicos de la cuenta destino.
import { readFileSync } from 'node:fs';
import { GoogleAdsApi } from 'google-ads-api';

function loadEnv() {
  try {
    for (const line of readFileSync(new URL('.env', import.meta.url), 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {}
}
loadEnv();

const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_ADS_CLIENT_ID,
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
});

try {
  console.log('\n→ Probando OAuth + developer token…');
  const accessible = await client.listAccessibleCustomers(process.env.GOOGLE_ADS_REFRESH_TOKEN);
  console.log('  ✓ Cuentas accesibles:', accessible.resource_names);

  console.log('\n→ Probando acceso a la cuenta destino vía MCC…');
  const customer = client.Customer({
    customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
    login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || undefined,
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
  });
  const rows = await customer.query(`
    SELECT customer.id, customer.descriptive_name, customer.currency_code,
           customer.time_zone, customer.manager, customer.test_account
    FROM customer LIMIT 1
  `);
  const c = rows[0].customer;
  console.log('  ✓ Cuenta:', c.descriptive_name || '(sin nombre)');
  console.log('    ID:', c.id, '| Moneda:', c.currency_code, '| Zona:', c.time_zone);
  console.log('    ¿Es manager/MCC?:', c.manager, '| ¿Cuenta de prueba?:', c.test_account);
  console.log('\n✅ Conexión OK. Listo para crear campañas.\n');
} catch (err) {
  console.error('\n✗ Falló la prueba:\n');
  if (err.errors) for (const e of err.errors) console.error('  •', e.error_code ? JSON.stringify(e.error_code) : '', e.message);
  else console.error(err.message || err);
  process.exit(1);
}
