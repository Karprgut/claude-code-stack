// ─────────────────────────────────────────────────────────────────
// Crea una campaña de SEARCH completa en Google Ads, de forma ATÓMICA
// (todo-o-nada) con mutateResources:
//   presupuesto → campaña (PAUSADA) → geo/idioma → negativas
//   → N grupos de anuncios, cada uno con keywords + anuncio responsive (RSA)
//
// Uso:
//   1) npm install
//   2) Llena .env (ver .env.example) y corre `npm run token` si falta el refresh token
//   3) Copia campaign.config.example.json a campaign.config.json y edítalo
//   4) npm run create
//
// La campaña nace PAUSADA: nada gasta hasta que la actives en la UI.
// ─────────────────────────────────────────────────────────────────
import { readFileSync } from 'node:fs';
import { GoogleAdsApi, enums, ResourceNames } from 'google-ads-api';

function loadEnv() {
  try {
    for (const line of readFileSync(new URL('.env', import.meta.url), 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {}
}
loadEnv();

const required = [
  'GOOGLE_ADS_DEVELOPER_TOKEN', 'GOOGLE_ADS_CLIENT_ID', 'GOOGLE_ADS_CLIENT_SECRET',
  'GOOGLE_ADS_REFRESH_TOKEN', 'GOOGLE_ADS_CUSTOMER_ID',
];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error('✗ Faltan variables en .env:\n  ' + missing.join('\n  '));
  process.exit(1);
}

const cfg = JSON.parse(readFileSync(new URL('./campaign.config.json', import.meta.url), 'utf8'));

const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_ADS_CLIENT_ID,
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
});

const cid = process.env.GOOGLE_ADS_CUSTOMER_ID;
const customer = client.Customer({
  customer_id: cid,
  login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || undefined,
  refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
});

const mt = (m) => enums.KeywordMatchType[m] ?? enums.KeywordMatchType.PHRASE;

// IDs temporales (negativos) para enlazar recursos dentro de la misma operación atómica
const BUDGET_TMP = '-1';
const CAMPAIGN_TMP = '-2';
const budgetRN = ResourceNames.campaignBudget(cid, BUDGET_TMP);
const campaignRN = ResourceNames.campaign(cid, CAMPAIGN_TMP);

// Soporta el esquema nuevo (adGroups[]) y el viejo (un solo grupo)
const adGroups = cfg.adGroups ?? [{
  name: cfg.adGroupName,
  finalUrl: cfg.finalUrl,
  keywords: cfg.keywords,
  responsiveSearchAd: cfg.responsiveSearchAd,
}];

const ops = [];

// 1) Presupuesto
ops.push({
  entity: 'campaign_budget',
  operation: 'create',
  resource: {
    resource_name: budgetRN,
    name: `${cfg.campaignName} · budget`,
    amount_micros: Math.round(cfg.dailyBudget * 1_000_000),
    delivery_method: enums.BudgetDeliveryMethod.STANDARD,
    explicitly_shared: false,
  },
});

// 2) Campaña (Search, PAUSADA) + estrategia de puja
const campaignResource = {
  resource_name: campaignRN,
  name: cfg.campaignName,
  advertising_channel_type: enums.AdvertisingChannelType.SEARCH,
  status: enums.CampaignStatus.PAUSED,
  campaign_budget: budgetRN,
  // Campo obligatorio en la API v20 (declaración de pub. política UE)
  contains_eu_political_advertising: 'DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING',
  network_settings: {
    target_google_search: true,
    target_search_network: true,
    target_content_network: false,
    target_partner_search_network: false,
  },
};
if (cfg.biddingStrategy === 'MANUAL_CPC') campaignResource.manual_cpc = { enhanced_cpc_enabled: false };
else if (cfg.biddingStrategy === 'MAXIMIZE_CONVERSIONS') campaignResource.maximize_conversions = {};
else campaignResource.target_spend = {}; // MAXIMIZE_CLICKS
ops.push({ entity: 'campaign', operation: 'create', resource: campaignResource });

// 3) Geo + idioma
for (const geo of cfg.geoTargetConstants ?? []) {
  ops.push({
    entity: 'campaign_criterion', operation: 'create',
    resource: { campaign: campaignRN, location: { geo_target_constant: ResourceNames.geoTargetConstant(geo) } },
  });
}
for (const lang of cfg.languageConstants ?? []) {
  ops.push({
    entity: 'campaign_criterion', operation: 'create',
    resource: { campaign: campaignRN, language: { language_constant: ResourceNames.languageConstant(lang) } },
  });
}

// 4) Negativas a nivel campaña
for (const k of cfg.negativeKeywords ?? []) {
  ops.push({
    entity: 'campaign_criterion', operation: 'create',
    resource: { campaign: campaignRN, negative: true, keyword: { text: k.text, match_type: mt(k.matchType) } },
  });
}

// 5) Grupos de anuncios + keywords + RSA
adGroups.forEach((ag, i) => {
  const agTmp = String(-(100 + i));
  const agRN = ResourceNames.adGroup(cid, agTmp);

  ops.push({
    entity: 'ad_group', operation: 'create',
    resource: {
      resource_name: agRN,
      name: ag.name,
      campaign: campaignRN,
      status: enums.AdGroupStatus.ENABLED,
      type: enums.AdGroupType.SEARCH_STANDARD,
      ...(cfg.biddingStrategy === 'MANUAL_CPC' && cfg.cpcBidMicros ? { cpc_bid_micros: cfg.cpcBidMicros } : {}),
    },
  });

  for (const k of ag.keywords ?? []) {
    ops.push({
      entity: 'ad_group_criterion', operation: 'create',
      resource: { ad_group: agRN, status: enums.AdGroupCriterionStatus.ENABLED, keyword: { text: k.text, match_type: mt(k.matchType) } },
    });
  }

  const rsa = ag.responsiveSearchAd;
  ops.push({
    entity: 'ad_group_ad', operation: 'create',
    resource: {
      ad_group: agRN,
      status: enums.AdGroupAdStatus.ENABLED,
      ad: {
        final_urls: [ag.finalUrl],
        responsive_search_ad: {
          headlines: rsa.headlines.map((t) => ({ text: t })),
          descriptions: rsa.descriptions.map((t) => ({ text: t })),
          path1: rsa.path1 || undefined,
          path2: rsa.path2 || undefined,
        },
      },
    },
  });
});

console.log(`\n→ Cuenta ${cid} · creando «${cfg.campaignName}» (PAUSADA)`);
console.log(`  ${adGroups.length} grupo(s) de anuncios · ${ops.length} operaciones atómicas\n`);

try {
  const res = await customer.mutateResources(ops);
  const responses = res.mutate_operation_responses ?? [];
  const campResp = responses.find((r) => r.campaign_result);
  const campRN = campResp?.campaign_result?.resource_name ?? '';
  const campId = campRN.split('/').pop();

  const count = (key) => responses.filter((r) => r[key]).length;
  console.log('  ✓ Presupuesto creado');
  console.log('  ✓ Campaña creada:', campRN);
  console.log('  ✓ Criterios de campaña (geo/idioma/negativas):', count('campaign_criterion_result'));
  console.log('  ✓ Grupos de anuncios:', count('ad_group_result'));
  console.log('  ✓ Keywords:', count('ad_group_criterion_result'));
  console.log('  ✓ Anuncios RSA:', count('ad_group_ad_result'));

  console.log('\n✅ Campaña creada y PAUSADA. Revísala y actívala aquí:');
  console.log(`   https://ads.google.com/aw/campaigns?campaignId=${campId}&__e=${cid}\n`);
} catch (err) {
  console.error('\n✗ Error al crear la campaña (no se creó nada — operación atómica):\n');
  if (err.errors) for (const e of err.errors) {
    const loc = (e.location?.field_path_elements ?? []).map((f) => f.field_name + (f.index != null ? `[${f.index}]` : '')).join(' → ');
    console.error('  •', e.message, '\n     código:', JSON.stringify(e.error_code), '\n     campo :', loc || '(sin ubicación)');
  } else console.error(err.message || err);
  process.exit(1);
}
