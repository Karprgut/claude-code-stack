import { MongoClient } from "mongodb";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envFile = readFileSync(resolve(__dirname, "..", ".env.local"), "utf8");
const match = envFile.match(/MONGODB_URI=(.+)/);
const client = new MongoClient(match[1]);
await client.connect();
const db = client.db("flint");
const syncs = await db.collection("jira_syncs").find().sort({ date: -1, time: -1 }).limit(10).toArray();
for (const s of syncs) {
  const hasEng = "engineers" in s;
  const keys = Object.keys(s).filter(k => k !== "_id").join(", ");
  console.log(`${s._id} | engineers: ${hasEng} | keys: ${keys}`);
}
await client.close();
