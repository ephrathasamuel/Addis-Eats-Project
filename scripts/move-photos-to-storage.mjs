// One-time move: photos saved inside database records (staff photos, dish
// photos, courier photos copied onto orders) go to the Supabase Storage
// "media" bucket, and each record keeps only the link. Nothing else in a
// record changes. A backup of every changed record is written to .addis-data/
// first.
//
// Usage: node scripts/move-photos-to-storage.mjs          (shows what would change)
//        node scripts/move-photos-to-storage.mjs --apply  (makes the changes)

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import nextEnv from "@next/env";

const root = process.cwd();
nextEnv.loadEnvConfig(root, false, { info() {}, error() {} });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key?.startsWith("sb_secret_")) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env.local.");
  process.exit(1);
}
const apply = process.argv.includes("--apply");
const auth = { apikey: key, Authorization: `Bearer ${key}` };
const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;
const FIELDS = { accounts: ["photo"], dishes: ["image"], orders: ["courierPhoto"] };
const PREFIX = { accounts: "staff", dishes: "dish", orders: "staff" };

const rows = await fetch(`${url}/rest/v1/addis_records?select=collection,id,data`, {
  headers: { ...auth, Range: "0-9999" },
}).then((r) => r.json());

const changes = [];
for (const row of rows) {
  for (const field of FIELDS[row.collection] || []) {
    const value = row.data?.[field];
    if (typeof value === "string" && DATA_URL.test(value)) changes.push({ row, field, value });
  }
}
const bytes = changes.reduce((sum, change) => sum + change.value.length, 0);
console.log(`${changes.length} inline photo(s) in ${new Set(changes.map((c) => c.row)).size} record(s), ${Math.round(bytes / 1024)} KB in total.`);
for (const change of changes) console.log(`  ${change.row.collection}/${change.row.id}.${change.field}`);
if (!apply || changes.length === 0) {
  if (!apply && changes.length) console.log("\nDry run. Run again with --apply to move them.");
  process.exit(0);
}

// Backup first.
const backupDir = path.join(root, ".addis-data");
fs.mkdirSync(backupDir, { recursive: true });
const backupFile = path.join(backupDir, `backup-photos-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
fs.writeFileSync(backupFile, JSON.stringify([...new Set(changes.map((c) => c.row))], null, 2));
console.log(`Backup written to ${backupFile}`);

// Bucket (public, 2 MB per file).
const bucket = await fetch(`${url}/storage/v1/bucket/media`, { headers: auth });
if (!bucket.ok) {
  const created = await fetch(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ id: "media", name: "media", public: true, file_size_limit: 2 * 1024 * 1024 }),
  });
  if (!created.ok) {
    console.error("Could not create the media bucket:", created.status, await created.text());
    process.exit(1);
  }
}

const uploaded = new Map();
async function upload(value, prefix) {
  if (uploaded.has(value)) return uploaded.get(value);
  const [, type, base64] = DATA_URL.exec(value);
  const buffer = Buffer.from(base64, "base64");
  const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[type];
  const file = `${prefix}/${crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 32)}.${extension}`;
  const response = await fetch(`${url}/storage/v1/object/media/${file}`, {
    method: "POST",
    headers: { ...auth, "Content-Type": type, "x-upsert": "true", "Cache-Control": "max-age=31536000" },
    body: buffer,
  });
  if (!response.ok) throw new Error(`upload ${file}: ${response.status} ${await response.text()}`);
  const link = `${url}/storage/v1/object/public/media/${file}`;
  const check = await fetch(link);
  if (!check.ok) throw new Error(`uploaded ${file} but it can't be opened (${check.status})`);
  uploaded.set(value, link);
  return link;
}

// Upload everything first; only then change the records.
for (const change of changes) change.link = await upload(change.value, PREFIX[change.row.collection]);
const updated = new Map();
for (const change of changes) {
  const row = updated.get(change.row) || { collection: change.row.collection, id: change.row.id, data: { ...change.row.data } };
  row.data[change.field] = change.link;
  updated.set(change.row, row);
}
const now = new Date().toISOString();
const response = await fetch(`${url}/rest/v1/addis_records?on_conflict=collection,id`, {
  method: "POST",
  headers: { ...auth, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
  body: JSON.stringify([...updated.values()].map((row) => ({ ...row, updated_at: now }))),
});
if (!response.ok) {
  console.error("Saving the records failed:", response.status, await response.text());
  process.exit(1);
}
console.log(`Moved ${uploaded.size} photo(s) to Storage and updated ${updated.size} record(s).`);
