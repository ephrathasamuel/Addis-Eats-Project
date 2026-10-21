// One-time cleanup: removes the demo orders and demo expenses that older
// versions of the app generated, and recalculates every dish's order count
// and rating from real orders. A backup of everything removed or changed is
// written to .addis-data/ first.
//
// Usage: node scripts/remove-demo-data.mjs          (shows what would change)
//        node scripts/remove-demo-data.mjs --apply  (makes the changes)

import fs from "node:fs";
import path from "node:path";
import nextEnv from "@next/env";

const root = process.cwd();
nextEnv.loadEnvConfig(root, false, { info() {}, error() {} });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key?.startsWith("sb_secret_")) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env.local.");
  process.exit(1);
}
const apply = process.argv.includes("--apply");
const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

// Exactly the records the old demo code created.
const DEMO_ORDER_IDS = new Set(["1000", "1001", "1002", "1003", "1004", "1005", "1006", "1007", "1008", "1009", "1010"]);
const DEMO_EXPENSE_NOTES = [
  "Fresh chicken from Debre Zeyit",
  "Prime beef for Kitfo & Tibs",
  "Shiro legumes, onions, garlic",
  "Weekend peak restock",
  "Vegetable produce from Piassa",
  "Tej wine honey, Harar coffee",
  "Western pasta & pizza flour",
];

const rows = await fetch(`${url}/rest/v1/addis_records?select=collection,id,data`, { headers: { ...headers, Range: "0-4999" } }).then((r) => r.json());
const of = (collection) => rows.filter((row) => row.collection === collection);

const demoOrders = of("orders").filter((row) => DEMO_ORDER_IDS.has(row.id) && row.data.ownerToken);
const demoExpenses = of("expenses").filter(
  (row) => !row.data.updatedAt && !row.data.createdBy && DEMO_EXPENSE_NOTES.some((note) => String(row.data.note || "").startsWith(note))
);
const realOrders = of("orders").filter((row) => !demoOrders.includes(row)).map((row) => row.data);

// Real per-dish stats.
const stats = new Map();
for (const order of realOrders) {
  if (order.status === "cancelled") continue;
  for (const item of order.items || []) {
    const s = stats.get(item.id) || { ordersCount: 0, ratings: [], highlight: "", highlightAt: "" };
    s.ordersCount += Number(item.qty) || 1;
    if (order.reviewed && order.reviewRating) {
      s.ratings.push(Number(order.reviewRating));
      const at = order.reviewEditedAt || order.reviewedAt || order.deliveredAt || "";
      if (order.reviewComment && at >= s.highlightAt) {
        s.highlight = order.reviewComment;
        s.highlightAt = at;
      }
    }
    stats.set(item.id, s);
  }
}
const dishUpdates = of("dishes").map((row) => {
  const s = stats.get(row.id) || { ordersCount: 0, ratings: [], highlight: "" };
  const rating = s.ratings.length ? Number((s.ratings.reduce((a, b) => a + b, 0) / s.ratings.length).toFixed(1)) : 0;
  return {
    row,
    next: { ...row.data, ordersCount: s.ordersCount, rating, reviewsCount: s.ratings.length, reviewHighlight: s.highlight },
  };
});
const changedDishes = dishUpdates.filter(({ row, next }) =>
  ["ordersCount", "rating", "reviewsCount", "reviewHighlight"].some((field) => row.data[field] !== next[field])
);

console.log(`Demo orders to remove: ${demoOrders.map((r) => `#${r.id}`).join(", ") || "none"}`);
console.log(`Demo expense days to remove: ${demoExpenses.map((r) => r.data.date).join(", ") || "none"}`);
console.log(`Real orders kept: ${realOrders.map((o) => `#${o.id}`).join(", ") || "none"}`);
console.log(`Dishes whose stats are recalculated from real orders: ${changedDishes.length}`);
for (const { row, next } of changedDishes.filter(({ next }) => next.ordersCount > 0 || next.reviewsCount > 0)) {
  console.log(`  ${row.data.name}: ${next.ordersCount} ordered, ${next.reviewsCount ? `${next.rating} stars from ${next.reviewsCount} review(s)` : "no reviews"}`);
}

if (!apply) {
  console.log("\nNothing changed. Run again with --apply to make these changes.");
  process.exit(0);
}

const backupDir = path.join(root, ".addis-data");
fs.mkdirSync(backupDir, { recursive: true });
const backupFile = path.join(backupDir, `backup-demo-data-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
fs.writeFileSync(
  backupFile,
  JSON.stringify({ demoOrders, demoExpenses, dishesBefore: changedDishes.map(({ row }) => row) }, null, 2)
);
console.log(`\nBackup written to ${path.relative(root, backupFile)}`);

async function remove(collection, ids) {
  if (!ids.length) return;
  const list = ids.map((id) => `"${id}"`).join(",");
  const response = await fetch(`${url}/rest/v1/addis_records?collection=eq.${collection}&id=in.(${encodeURIComponent(list)})`, {
    method: "DELETE",
    headers,
  });
  if (!response.ok) throw new Error(`Deleting ${collection} failed: ${await response.text()}`);
}
await remove("orders", demoOrders.map((r) => r.id));
await remove("expenses", demoExpenses.map((r) => r.id));
if (changedDishes.length) {
  const response = await fetch(`${url}/rest/v1/addis_records?on_conflict=collection,id`, {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(changedDishes.map(({ row, next }) => ({ collection: "dishes", id: row.id, data: next, updated_at: new Date().toISOString() }))),
  });
  if (!response.ok) throw new Error(`Updating dishes failed: ${await response.text()}`);
}
console.log("Done.");
