#!/usr/bin/env node
/**
 * Ingest campaign data from the starter's scraper output into MongoDB.
 *
 * Usage:
 *   node scripts/ingest-campaigns.mjs                  # default starter path
 *   node scripts/ingest-campaigns.mjs --from <dir>     # custom data dir
 *   node scripts/ingest-campaigns.mjs --seed-clients   # also (re)seed ad_clients
 *
 * Reads:
 *   <dir>/consolidated.json     -> campaign_snapshots
 *   <dir>/meta-ads-latest.json  -> meta_ad_snapshots
 *
 * Both inserts are timestamped — history is preserved. The pages always render
 * the most recent snapshot (sort by generatedAt / scrapedAt desc).
 */

import { MongoClient } from "mongodb";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Local scrapers live in ../../ops/campaigns/data (relative to dashboard/scripts/)
const DEFAULT_DATA_DIR = resolve(__dirname, "..", "..", "ops", "campaigns", "data");

const SEED_CLIENTS = [
  {
    _id: "KAB",
    code: "KAB",
    name: "Kabrita",
    project: "KCL",
    metaAccountId: "act_<ID>",
    googleCustomerId: "458-921-8366",
    googleSessionKey: "ladon",
    tiktokAdvertiserId: "<ADVERTISER_ID>",
    monthlyBudget: { meta: 89700, google: 85800, tiktok: 19500 },
    focusMetrics: ["purchases", "engagement"],
    mediaPlanUrl: "https://docs.google.com/spreadsheets/d/19SNK7y5F1gJ-tWMvzC7oEYwcINRGEg1LDeIwzeG7fpE/edit",
    notes: "Kari agregará campañas de engagement mañana. Las 2 activas actuales suman $78,000 del total.",
  },
  {
    _id: "RTH",
    code: "RTH",
    name: "Ruth's Chris",
    project: "KCL",
    metaAccountId: "act_<ID>",
    googleCustomerId: "635-947-3348",
    googleSessionKey: "kcl",
    monthlyBudget: { meta: 17500, google: 17500 },
    focusMetrics: ["link_clicks", "engagement"],
    mediaPlanUrl: "https://docs.google.com/spreadsheets/d/1eZhSd0d-VuLfGxAIt8kpHu11hxk5gv0e71nsY2fcldc/edit",
  },
  {
    _id: "TBP",
    code: "TBP",
    name: "The Branding People",
    project: "KCL",
    metaAccountId: "act_<ID>",
    googleCustomerId: "294-973-2003",
    googleSessionKey: "tbp",
    monthlyBudget: { meta: 12500, google: 7500, tiktok: 2500 },
    focusMetrics: ["lead", "link_clicks"],
    mediaPlanUrl: "https://docs.google.com/spreadsheets/d/1_T0pFMNPBpNmVElnRZwBJWAwS3EQT8sb9tHACS37P7o/edit",
    excludeFromMonthlyBudget: ["Portfolio", "Vacante"],
  },
];

function getMongoUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  try {
    const envLocal = readFileSync(resolve(__dirname, "..", ".env.local"), "utf-8");
    const match = envLocal.match(/MONGODB_URI=(.+)/);
    if (match) return match[1].trim();
  } catch {}
  throw new Error("No MONGODB_URI found");
}

function parseArgs(argv) {
  const args = { from: DEFAULT_DATA_DIR, seedClients: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--from" && argv[i + 1]) {
      args.from = argv[i + 1];
      i++;
    } else if (argv[i] === "--seed-clients") {
      args.seedClients = true;
    }
  }
  return args;
}

function tsId(prefix, iso) {
  const safe = (iso || new Date().toISOString()).replace(/:/g, "-").replace(/\..+$/, "");
  return `${prefix}_${safe}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dataDir = resolve(args.from);
  const consolidatedPath = resolve(dataDir, "consolidated.json");
  const metaAdsPath = resolve(dataDir, "meta-ads-latest.json");

  console.log(`Ingesting from: ${dataDir}`);

  const client = new MongoClient(getMongoUri());
  await client.connect();
  const db = client.db("flint");

  try {
    if (args.seedClients) {
      const col = db.collection("ad_clients");
      for (const c of SEED_CLIENTS) {
        await col.replaceOne({ _id: c._id }, c, { upsert: true });
      }
      console.log(`Seeded ${SEED_CLIENTS.length} ad_clients`);
    }

    if (existsSync(consolidatedPath)) {
      const consolidated = JSON.parse(readFileSync(consolidatedPath, "utf-8"));
      const generatedAt = consolidated.generatedAt || new Date().toISOString();
      const doc = {
        _id: tsId("snap", generatedAt),
        generatedAt,
        platforms: consolidated.platforms || {},
        alerts: consolidated.alerts || [],
      };
      await db.collection("campaign_snapshots").replaceOne({ _id: doc._id }, doc, { upsert: true });
      const platformCount = Object.keys(doc.platforms).length;
      const accountCount = Object.values(doc.platforms).reduce((s, p) => s + (p.accounts?.length || 0), 0);
      console.log(`campaign_snapshot: ${doc._id}  (${platformCount} platforms, ${accountCount} accounts, ${doc.alerts.length} alerts)`);
    } else {
      console.log(`Skipped consolidated.json — not found at ${consolidatedPath}`);
    }

    if (existsSync(metaAdsPath)) {
      const metaAds = JSON.parse(readFileSync(metaAdsPath, "utf-8"));
      const scrapedAt = metaAds.scrapedAt || new Date().toISOString();
      const doc = {
        _id: tsId("metaads", scrapedAt),
        platform: metaAds.platform || "meta",
        scrapedAt,
        accounts: metaAds.accounts || [],
      };
      await db.collection("meta_ad_snapshots").replaceOne({ _id: doc._id }, doc, { upsert: true });
      const adCount = doc.accounts.reduce((s, a) => s + (a.ads?.length || 0), 0);
      console.log(`meta_ad_snapshot: ${doc._id}  (${doc.accounts.length} accounts, ${adCount} ads)`);
    } else {
      console.log(`Skipped meta-ads-latest.json — not found at ${metaAdsPath}`);
    }

    console.log("Done.");
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
