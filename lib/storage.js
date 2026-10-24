import "server-only";
import crypto from "node:crypto";

// Photos in Supabase Storage (a public "media" bucket), so the database only
// keeps a short link instead of the whole picture. Every function returns null
// on any problem and the caller keeps the photo the old way (inline).
// Set ADDIS_STORAGE=off to switch this off completely.

const BUCKET = "media";

function storageConfig() {
  if (process.env.ADDIS_STORAGE === "off") return null;
  // ADDIS_DB_URL lets tests point this at a stand-in server.
  const url = (process.env.ADDIS_DB_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key || !key.startsWith("sb_secret_")) return null;
  return { url: url.replace(/\/$/, ""), key };
}

const state = globalThis.__addis_storage || (globalThis.__addis_storage = { bucketReady: false, disabledUntil: 0 });

async function call(path, init = {}) {
  const { url, key } = storageConfig();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    return await fetch(`${url}/storage/v1${path}`, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
      headers: { apikey: key, Authorization: `Bearer ${key}`, ...(init.headers || {}) },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function ensureBucket() {
  if (state.bucketReady) return true;
  const existing = await call(`/bucket/${BUCKET}`);
  if (existing.ok) {
    state.bucketReady = true;
    return true;
  }
  const created = await call("/bucket", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true, file_size_limit: 2 * 1024 * 1024 }),
  });
  const text = created.ok ? "" : await created.text();
  state.bucketReady = created.ok || /already exists|Duplicate/i.test(text);
  return state.bucketReady;
}

export function publicUrl(path) {
  const config = storageConfig();
  return config ? `${config.url}/storage/v1/object/public/${BUCKET}/${path}` : null;
}

/** True for links to photos stored by uploadImage. */
export function isStorageUrl(value) {
  return typeof value === "string" && value.includes(`/storage/v1/object/public/${BUCKET}/`);
}

/**
 * Uploads an image and returns its public link, or null (caller falls back).
 * The same picture always gets the same name, so repeats aren't stored twice.
 */
export async function uploadImage(buffer, contentType, prefix = "img") {
  if (!storageConfig() || Date.now() < state.disabledUntil) return null;
  try {
    if (!(await ensureBucket())) throw new Error("bucket unavailable");
    const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[contentType] || "jpg";
    const hash = crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 32);
    const path = `${prefix.replace(/[^a-z]/g, "") || "img"}/${hash}.${extension}`;
    const response = await call(`/object/${BUCKET}/${path}`, {
      method: "POST",
      headers: { "Content-Type": contentType, "x-upsert": "true", "Cache-Control": "max-age=31536000" },
      body: buffer,
    });
    if (!response.ok) throw new Error(`upload ${response.status}`);
    return publicUrl(path);
  } catch (error) {
    // Don't retry on every request while Storage is unavailable.
    state.disabledUntil = Date.now() + 5 * 60 * 1000;
    console.warn("[addis-eats] Photo upload to Supabase Storage failed; keeping the photo inline.", error.message);
    return null;
  }
}
