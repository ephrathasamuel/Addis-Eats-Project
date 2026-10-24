import "server-only";
import { readJson, writeJson } from "@/lib/datastore";

// Restaurant settings the admin can change. With nothing saved the restaurant
// is always open, exactly as before these settings existed.
//   paused:  stop taking new orders right now (e.g. kitchen too busy)
//   hours:   { open: "09:00", close: "22:00" } in Addis Ababa time, or null
//            for no fixed hours. A close time before the open time means
//            the kitchen works past midnight.

const STORE = "settings.json";
const DEFAULTS = { paused: false, pauseMessage: "", hours: null };
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// Read fresh every time: it's one small record, and route handlers and server
// actions load separate copies of this module, so a module-level cache could
// show one of them an old value.
export function getSettings() {
  const saved = readJson(STORE, null);
  return { ...DEFAULTS, ...(saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {}) };
}

export function saveSettings(changes) {
  const next = { ...getSettings() };
  if ("paused" in changes) next.paused = Boolean(changes.paused);
  if ("pauseMessage" in changes) next.pauseMessage = String(changes.pauseMessage || "").trim().slice(0, 160);
  if ("hours" in changes) {
    const hours = changes.hours;
    if (!hours) {
      next.hours = null;
    } else if (TIME_RE.test(hours.open || "") && TIME_RE.test(hours.close || "") && hours.open !== hours.close) {
      next.hours = { open: hours.open, close: hours.close };
    } else {
      return { ok: false, error: "Enter opening and closing times like 09:00 and 22:00 (they can't be the same)." };
    }
  }
  next.updatedAt = new Date().toISOString();
  writeJson(STORE, next);
  return { ok: true, settings: { ...next } };
}

// Minutes since midnight in Addis Ababa (UTC+3, no daylight saving).
function addisMinutes(date = new Date()) {
  const minutes = date.getUTCHours() * 60 + date.getUTCMinutes() + 180;
  return minutes % (24 * 60);
}

const toMinutes = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

/**
 * Whether new orders are accepted right now.
 * Returns { open: true } or { open: false, reason, message }.
 */
export function getOrderingStatus(date = new Date()) {
  const settings = getSettings();
  if (settings.paused) {
    return {
      open: false,
      reason: "paused",
      message: settings.pauseMessage || "We're not taking new orders right now. Please check back soon.",
    };
  }
  if (settings.hours) {
    const now = addisMinutes(date);
    const open = toMinutes(settings.hours.open);
    const close = toMinutes(settings.hours.close);
    const isOpen = open < close ? now >= open && now < close : now >= open || now < close;
    if (!isOpen) {
      return {
        open: false,
        reason: "hours",
        message: `We're closed right now. We take orders from ${settings.hours.open} to ${settings.hours.close}.`,
      };
    }
  }
  return { open: true };
}
