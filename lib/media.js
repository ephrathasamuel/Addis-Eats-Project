import "server-only";
import fs from "node:fs";
import crypto from "node:crypto";
import { dataPath, writeDataFile } from "@/lib/datastore";

// Uploaded images (dish photos, staff photos) are resized in the browser,
// sent as data URLs, and stored here as files served by app/media/[file].

const TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_BYTES = 2 * 1024 * 1024;
export const MEDIA_FILE_RE = /^[a-z]+-[0-9a-f-]{36}\.(jpg|png|webp)$/;

export const MEDIA_CONTENT_TYPES = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function isDataImage(value) {
  return typeof value === "string" && value.startsWith("data:image/");
}

// Returns { ok, url } or { ok: false, error }.
export function saveDataUrlImage(dataUrl, prefix = "img") {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ""));
  if (!match) {
    return { ok: false, error: "Upload a JPEG, PNG, or WebP image." };
  }
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length === 0 || buffer.length > MAX_BYTES) {
    return { ok: false, error: "Images must be smaller than 2 MB." };
  }
  const fileName = `${prefix.replace(/[^a-z]/g, "") || "img"}-${crypto.randomUUID()}.${TYPES[match[1]]}`;
  if (!writeDataFile(["uploads", fileName], buffer)) {
    // No writable disk (e.g. serverless hosting): keep the photo inline.
    return { ok: true, url: dataUrl };
  }
  return { ok: true, url: `/media/${fileName}` };
}

export function readMediaFile(fileName) {
  if (!MEDIA_FILE_RE.test(fileName)) return null;
  const file = dataPath("uploads", fileName);
  try {
    return fs.existsSync(file) ? fs.readFileSync(file) : null;
  } catch {
    return null;
  }
}

// Accepts either an existing image path or a freshly uploaded data URL and
// returns the path to store, or an error.
export function resolveImageInput(value, prefix) {
  const input = String(value || "").trim();
  if (!input) return { ok: true, url: "" };
  if (isDataImage(input)) return saveDataUrlImage(input, prefix);
  if (input.startsWith("/images/") || input.startsWith("/media/")) return { ok: true, url: input };
  if (/^https:\/\/(upload|commons)\.wikimedia\.org\//.test(input)) return { ok: true, url: input };
  return { ok: false, error: "Attach a photo, or use an image path that starts with /images/." };
}
