import "server-only";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// Small JSON-file persistence shared by the local stores (accounts, dishes,
// expenses, uploads). Writes go to a temp file first and are renamed into
// place so a crash mid-write never leaves a half-written store behind.

export function getDataDir() {
  return process.env.ADDIS_DATA_DIR || path.join(process.cwd(), ".addis-data");
}

export function dataPath(...segments) {
  // Runtime data, not source: keep it out of Turbopack's file tracing.
  return path.join(/*turbopackIgnore: true*/ getDataDir(), ...segments);
}

export function readJson(name, fallback) {
  const file = dataPath(name);
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch (error) {
    throw new Error(`Unable to read the local ${name} store.`, { cause: error });
  }
}

export function writeJson(name, value) {
  const file = dataPath(name);
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    const temporaryPath = `${file}.${crypto.randomUUID()}.tmp`;
    fs.writeFileSync(temporaryPath, JSON.stringify(value), { encoding: "utf-8", mode: 0o600 });
    fs.renameSync(temporaryPath, file);
  } catch (error) {
    throw new Error(`Unable to save the local ${name} store.`, { cause: error });
  }
}
