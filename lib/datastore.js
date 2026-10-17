import "server-only";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

// Small JSON-file persistence shared by the local stores (accounts, dishes,
// expenses, uploads). Writes go to a temp file first and are renamed into
// place so a crash mid-write never leaves a half-written store behind.
//
// Serverless hosts such as Vercel have a read-only project folder; only the
// OS temp folder is writable there, and it is wiped whenever the instance is
// recycled. Saving is therefore best-effort: a failed write is logged and the
// in-memory data keeps working, instead of crashing the page.

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

export function readJson(name, fallback) {
  const file = dataPath(name);
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch (error) {
    warnOnce(`read:${name}`, `Could not read ${file}; starting from defaults.`, error);
    return fallback;
  }
}

// Returns true when the data reached disk.
export function writeJson(name, value) {
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
