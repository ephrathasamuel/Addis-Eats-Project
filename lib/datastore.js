import "server-only";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { after } from "next/server";
import { unstable_rethrow } from "next/navigation";

// Persistence shared by the stores (accounts, dishes, expenses, orders).
//
// Two backends:
// 1. Supabase database (when NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY
//    are set and the `addis_records` table exists). Every server instance,
//    including each Vercel instance and the PC version, shares the same data.
//    Each request loads the latest records first (syncData) and every change
//    is written back before the request finishes (flushData).
// 2. JSON files in .addis-data (local development, or as a fallback). On
//    read-only hosts saving is best-effort and data stays in memory.
//
// Stores keep their data in memory and read it synchronously; they reload
// whenever storeGeneration() changes, which happens after each sync.

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

export function getDataDir() {
  if (process.env.ADDIS_DATA_DIR) return process.env.ADDIS_DATA_DIR;
  if (process.env.VERCEL) return path.join(os.tmpdir(), "addis-data");
  return path.join(process.cwd(), ".addis-data");
}

export function dataPath(...segments) {
  // Runtime data, not source: keep it out of Turbopack's file tracing.
  return path.join(/*turbopackIgnore: true*/ getDataDir(), ...segments);
}

const warned = new Set();
function warnOnce(key, message, error) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[addis-eats] ${message}`, error?.code || error?.message || "");
}

function readFile(name, fallback) {
  const file = dataPath(name);
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch (error) {
    warnOnce(`read:${name}`, `Could not read ${file}; starting from defaults.`, error);
    return fallback;
  }
}

function writeFile(name, value) {
  const file = dataPath(name);
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    const temporaryPath = `${file}.${crypto.randomUUID()}.tmp`;
    fs.writeFileSync(temporaryPath, JSON.stringify(value), { encoding: "utf-8", mode: 0o600 });
    fs.renameSync(temporaryPath, file);
    return true;
  } catch (error) {
    warnOnce(`write:${name}`, `Could not save ${file}; changes are kept in memory only.`, error);
    return false;
  }
}

// Writes a binary file under the data directory. Returns true on success.
export function writeDataFile(segments, buffer) {
  const file = dataPath(...segments);
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    fs.writeFileSync(file, buffer, { mode: 0o600 });
    return true;
  } catch (error) {
    warnOnce(`file:${segments[0]}`, `Could not save ${file}.`, error);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Supabase database
// ---------------------------------------------------------------------------

const TABLE = "addis_records";
// Stores that move to the database (and get copied there from local files once).
const SHARED_STORES = ["accounts.json", "dishes.json", "orders.json", "expenses.json", "push_subscriptions.json"];
const DOC_ID = "_doc";
// Requests that arrive while a load is already in flight share it.
const SYNC_INTERVAL_MS = 0;

const db =
  globalThis.__addis_db ||
  (globalThis.__addis_db = {
    disabled: false,
    ready: false,
    lastSync: 0,
    generation: 0,
    cache: new Map(), // collection -> Map(id -> data)
    snapshot: new Map(), // collection -> Map(id -> JSON last written/read)
    queue: Promise.resolve(),
    syncing: null,
  });

function databaseConfig() {
  // ADDIS_DB_URL lets tests point the store at a stand-in database.
  const url = (process.env.ADDIS_DB_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key || !key.startsWith("sb_secret_") || db.disabled) return null;
  return { url, key };
}

export function isDatabaseMode() {
  return Boolean(databaseConfig()) && db.ready;
}

export function storeGeneration() {
  return db.generation;
}

function collectionOf(name) {
  return `${process.env.ADDIS_DB_NAMESPACE || ""}${name.replace(/\.json$/, "")}`;
}

async function rest(method, query, { body, prefer, range } = {}) {
  const { url, key } = databaseConfig();
  const response = await fetch(`${url}/rest/v1/${TABLE}${query}`, {
    method,
    cache: "no-store",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
      ...(range ? { Range: range, "Range-Unit": "items" } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`Supabase ${method} ${response.status}: ${text.slice(0, 200)}`);
    error.status = response.status;
    error.missingTable = text.includes("PGRST205") || text.includes("42P01");
    throw error;
  }
  return method === "GET" ? response.json() : null;
}

async function fetchAllRows() {
  const prefix = process.env.ADDIS_DB_NAMESPACE || "";
  const filter = prefix ? `&collection=like.${encodeURIComponent(prefix)}*` : "";
  const rows = [];
  for (let start = 0; ; start += 1000) {
    const page = await rest("GET", `?select=collection,id,data&order=collection,id${filter}`, {
      range: `${start}-${start + 999}`,
    });
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

function toRows(value) {
  if (Array.isArray(value)) {
    return new Map(value.filter((item) => item && item.id !== undefined).map((item) => [String(item.id), item]));
  }
  return new Map([[DOC_ID, value]]);
}

function fromRows(rows, fallback) {
  if (!rows || rows.size === 0) return fallback;
  if (rows.has(DOC_ID) && rows.size === 1) return rows.get(DOC_ID);
  return [...rows.values()];
}

// Queues upserts/deletes for whatever changed since the last read or write.
function queueChanges(collection, nextRows) {
  const previous = db.snapshot.get(collection) || new Map();
  const nextSnapshot = new Map();
  const upserts = [];
  for (const [id, data] of nextRows) {
    const json = JSON.stringify(data);
    nextSnapshot.set(id, json);
    if (previous.get(id) !== json) upserts.push({ collection, id, data, updated_at: new Date().toISOString() });
  }
  const deletes = [...previous.keys()].filter((id) => !nextRows.has(id));
  db.snapshot.set(collection, nextSnapshot);
  db.cache.set(collection, nextRows);
  if (upserts.length === 0 && deletes.length === 0) return;

  db.queue = db.queue
    .then(async () => {
      for (let i = 0; i < upserts.length; i += 200) {
        await rest("POST", "?on_conflict=collection,id", {
          body: upserts.slice(i, i + 200),
          prefer: "resolution=merge-duplicates,return=minimal",
        });
      }
      if (deletes.length > 0) {
        const ids = deletes.map((id) => `"${id.replace(/"/g, '\\"')}"`).join(",");
        await rest("DELETE", `?collection=eq.${encodeURIComponent(collection)}&id=in.(${encodeURIComponent(ids)})`);
      }
    })
    .catch((error) => console.error("[addis-eats] Saving to Supabase failed:", error.message));

  // Safety net: finish saving even if the caller never awaits flushData().
  try {
    after(() => flushData());
  } catch {
    // Not inside a request (e.g. build time).
  }
}

/**
 * Loads the latest shared data from Supabase. Called at the start of every
 * request (through getSession and the dish queries). Cheap to call repeatedly.
 */
export async function syncData() {
  if (!databaseConfig()) return;
  if (db.ready && Date.now() - db.lastSync < SYNC_INTERVAL_MS) return;
  if (db.syncing) return db.syncing;

  db.syncing = (async () => {
    try {
      await db.queue; // never read over our own unsaved changes
      const rows = await fetchAllRows();
      const cache = new Map();
      const snapshot = new Map();
      for (const row of rows) {
        if (!cache.has(row.collection)) {
          cache.set(row.collection, new Map());
          snapshot.set(row.collection, new Map());
        }
        cache.get(row.collection).set(row.id, row.data);
        snapshot.get(row.collection).set(row.id, JSON.stringify(row.data));
      }
      db.cache = cache;
      db.snapshot = snapshot;
      const firstSync = !db.ready;
      db.ready = true;
      db.lastSync = Date.now();
      db.generation += 1;

      // First time on an empty database: copy the local data files across.
      if (firstSync && rows.length === 0) {
        const copied = [];
        for (const name of SHARED_STORES) {
          const local = readFile(name, null);
          if (local !== null) {
            queueChanges(collectionOf(name), toRows(local));
            copied.push(name);
          }
        }
        await db.queue;
        db.generation += 1;
        if (copied.length) console.log(`[addis-eats] Copied local ${copied.join(", ")} into Supabase.`);
      }
    } catch (error) {
      // Let Next.js see its own control-flow errors (e.g. the build-time signal
      // that a page reads live data and must not be prerendered).
      unstable_rethrow(error);
      if (error.missingTable) {
        db.disabled = true;
        console.warn(`[addis-eats] Supabase table "${TABLE}" not found; run supabase/setup.sql. Using local files for now.`);
      } else {
        console.error("[addis-eats] Could not load data from Supabase:", error.message);
      }
    } finally {
      db.syncing = null;
    }
  })();
  return db.syncing;
}

// ---------------------------------------------------------------------------
// Claim locks
// ---------------------------------------------------------------------------
// Saves overwrite whole records, so two servers could both think they won the
// same order. A claim therefore first inserts a lock row, which the database
// accepts only once per name. Results:
//   { state: "created" }   we took the lock now
//   { state: "owned" }     we already held it
//   { state: "taken", owner, at }  someone else holds it
//   { state: "skipped" }   no database (one server: the in-memory check is
//                          enough) or the lock could not be checked; the
//                          caller carries on exactly as before.

const LOCKS = "locks.json";

export async function takeLock(name, owner, { force = false } = {}) {
  if (!isDatabaseMode()) return { state: "skipped" };
  const collection = collectionOf(LOCKS);
  const row = { collection, id: name, data: { owner, at: new Date().toISOString() }, updated_at: new Date().toISOString() };
  try {
    await rest("POST", force ? "?on_conflict=collection,id" : "", {
      body: [row],
      prefer: force ? "resolution=merge-duplicates,return=minimal" : "return=minimal",
    });
    return { state: "created" };
  } catch (error) {
    if (error.status !== 409) {
      warnOnce("lock", "Could not check a claim lock; carrying on without it.", error);
      return { state: "skipped" };
    }
  }
  try {
    const [existing] = await rest(
      "GET",
      `?select=data&collection=eq.${encodeURIComponent(collection)}&id=eq.${encodeURIComponent(name)}`
    );
    if (!existing) return takeLock(name, owner, { force });
    if (String(existing.data?.owner) === String(owner)) return { state: "owned" };
    return { state: "taken", owner: existing.data?.owner, at: existing.data?.at };
  } catch (error) {
    warnOnce("lock", "Could not check a claim lock; carrying on without it.", error);
    return { state: "skipped" };
  }
}

export async function dropLock(name) {
  if (!isDatabaseMode()) return;
  try {
    const collection = collectionOf(LOCKS);
    await rest("DELETE", `?collection=eq.${encodeURIComponent(collection)}&id=in.(${encodeURIComponent(`"${name}"`)})`);
  } catch (error) {
    warnOnce("unlock", "Could not remove a claim lock.", error);
  }
}

/** Waits until every queued change has been written to Supabase. */
export async function flushData() {
  await db.queue;
}

// ---------------------------------------------------------------------------
// Store API (synchronous)
// ---------------------------------------------------------------------------

export function readJson(name, fallback) {
  if (isDatabaseMode() && SHARED_STORES.includes(name)) {
    return fromRows(db.cache.get(collectionOf(name)), fallback);
  }
  return readFile(name, fallback);
}

// Returns true when the data was saved (or queued for the database).
export function writeJson(name, value) {
  if (isDatabaseMode() && SHARED_STORES.includes(name)) {
    queueChanges(collectionOf(name), toRows(value));
    return true;
  }
  return writeFile(name, value);
}
