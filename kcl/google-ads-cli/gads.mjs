import fs from 'node:fs';

const env = Object.fromEntries(
  fs.readFileSync(new URL('./.env', import.meta.url), 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const MCC = env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;

async function token() {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_ADS_CLIENT_ID,
      client_secret: env.GOOGLE_ADS_CLIENT_SECRET,
      refresh_token: env.GOOGLE_ADS_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('OAuth: ' + JSON.stringify(j));
  return j.access_token;
}

export async function search(customerId, query, version = 'v21') {
  const at = await token();
  const r = await fetch(
    `https://googleads.googleapis.com/${version}/customers/${customerId}/googleAds:search`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${at}`,
        'developer-token': env.GOOGLE_ADS_DEVELOPER_TOKEN,
        'login-customer-id': MCC,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  );
  const txt = await r.text();
  if (!r.ok) return { error: r.status, body: txt.slice(0, 900), version };
  return JSON.parse(txt);
}

export async function mutate(customerId, endpoint, payload, version = 'v21') {
  const at = await token();
  const r = await fetch(
    `https://googleads.googleapis.com/${version}/customers/${customerId}/${endpoint}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${at}`,
        'developer-token': env.GOOGLE_ADS_DEVELOPER_TOKEN,
        'login-customer-id': MCC,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );
  const txt = await r.text();
  if (!r.ok) return { error: r.status, body: txt.slice(0, 1200) };
  return JSON.parse(txt);
}

const CUENTA_DEFAULT = '<CUSTOMER_ID>';   // la cuenta que consulta si no pasas otra

if (process.argv[2] === 'campaigns') {
  const cid = process.argv[3] ?? CUENTA_DEFAULT;

  // detecta la versión de API que responde
  let VER = null;
  for (const v of ['v21', 'v20', 'v19', 'v18']) {
    const probe = await search(cid, 'SELECT customer.id FROM customer LIMIT 1', v);
    if (!probe.error) { VER = v; break; }
    console.log(`[${v}] ${probe.error}: ${probe.body.slice(0, 160)}`);
  }
  if (!VER) process.exit(1);
  console.log(`API ${VER}\n`);

  const res = await search(
    cid,
    `SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type,
            campaign.end_date, campaign_budget.id, campaign_budget.amount_micros,
            metrics.cost_micros
     FROM campaign
     WHERE segments.date BETWEEN '2026-08-01' AND '2026-08-03'
       AND campaign.status != 'REMOVED'`,
    VER
  );
  if (res.error) { console.log(`error ${res.error}: ${res.body}`); process.exit(1); }
  console.log('=== Gasto 1-3 agosto ===');
  for (const r of res.results ?? []) {
    const daily = Number(r.campaignBudget.amountMicros) / 1e6;
    const spent = Number(r.metrics?.costMicros ?? 0) / 1e6;
    console.log(
      `${r.campaign.id} | ${r.campaign.status} | ${r.campaign.advertisingChannelType} | daily $${daily.toFixed(2)} | gasto $${spent.toFixed(2)} | budget ${r.campaignBudget.id} | fin ${r.campaign.endDate ?? '-'} | ${r.campaign.name}`
    );
  }

  const all = await search(
    cid,
    `SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type,
            campaign.end_date, campaign_budget.id, campaign_budget.amount_micros
     FROM campaign WHERE campaign.status = 'ENABLED'`,
    VER
  );
  console.log('\n=== Campañas ENABLED ===');
  for (const r of all.results ?? []) {
    const daily = Number(r.campaignBudget.amountMicros) / 1e6;
    console.log(
      `${r.campaign.id} | ${r.campaign.advertisingChannelType} | daily $${daily.toFixed(2)} | budget ${r.campaignBudget.id} | fin ${r.campaign.endDate ?? '-'} | ${r.campaign.name}`
    );
  }

  // gasto de julio, para contexto de pacing
  const jul = await search(
    cid,
    `SELECT campaign.id, campaign.name, metrics.cost_micros
     FROM campaign
     WHERE segments.date BETWEEN '2026-07-01' AND '2026-07-31'
       AND campaign.status != 'REMOVED'`,
    VER
  );
  console.log('\n=== Gasto julio ===');
  let tot = 0;
  for (const r of jul.results ?? []) {
    const spent = Number(r.metrics?.costMicros ?? 0) / 1e6;
    tot += spent;
    console.log(`${r.campaign.id} | $${spent.toFixed(2)} | ${r.campaign.name}`);
  }
  console.log(`TOTAL julio: $${tot.toFixed(2)}`);
}

if (process.argv[2] === 'accounts') {
  for (const v of ['v21', 'v20', 'v19', 'v18']) {
    const res = await search(
      MCC,
      `SELECT customer_client.id, customer_client.descriptive_name, customer_client.manager,
              customer_client.status, customer_client.currency_code
       FROM customer_client WHERE customer_client.status = 'ENABLED'`,
      v
    );
    if (res.error) { console.log(`[${v}] error ${res.error}: ${res.body.slice(0, 200)}`); continue; }
    console.log(`API ${v} OK — cuentas accesibles:`);
    for (const row of res.results ?? []) {
      const c = row.customerClient;
      console.log(`  ${c.id}  ${c.manager ? '[MCC] ' : '      '}${c.descriptiveName ?? '(sin nombre)'}  ${c.currencyCode ?? ''}`);
    }
    break;
  }
}
