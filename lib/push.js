import "server-only";
import crypto from "node:crypto";
import webpush from "web-push";
import { after } from "next/server";
import { readJson, writeJson } from "@/lib/datastore";

// Web Push notifications. Browsers subscribe through /api/push/subscribe;
// subscriptions are stored with the user's id and role so we can notify one
// customer about their order, or every courier / cook about new work.

const STORE = "push_subscriptions.json";

function configured() {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT?.trim() || "mailto:hello@addiseats.et", publicKey, privateKey);
  return true;
}

export function getPushPublicKey() {
  return process.env.VAPID_PUBLIC_KEY?.trim() || null;
}

function load() {
  const list = readJson(STORE, []);
  return Array.isArray(list) ? list : [];
}

const idFor = (endpoint) => crypto.createHash("sha256").update(endpoint).digest("hex").slice(0, 32);

export function saveSubscription(user, subscription) {
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) return false;
  const id = idFor(subscription.endpoint);
  const list = load().filter((entry) => entry.id !== id);
  list.push({ id, userId: user.id, role: user.role, subscription, createdAt: new Date().toISOString() });
  writeJson(STORE, list);
  return true;
}

export function removeSubscription(endpoint, userId) {
  const id = idFor(String(endpoint || ""));
  writeJson(
    STORE,
    load().filter((entry) => entry.id !== id || (userId && entry.userId && String(entry.userId) !== String(userId)))
  );
}

async function deliver(entries, payload) {
  if (!configured() || entries.length === 0) return;
  const body = JSON.stringify(payload);
  const expired = [];
  await Promise.all(
    entries.map((entry) =>
      webpush.sendNotification(entry.subscription, body, { TTL: 60 * 60 }).catch((error) => {
        // 404/410: the browser dropped this subscription.
        if (error?.statusCode === 404 || error?.statusCode === 410) expired.push(entry.id);
      })
    )
  );
  if (expired.length) writeJson(STORE, load().filter((entry) => !expired.includes(entry.id)));
}

// Sends after the response, so notifications never slow down a button tap.
function send(filter, payload) {
  const entries = load().filter(filter);
  const task = () => deliver(entries, payload).catch((error) => console.warn("[addis-eats] Push failed:", error.message));
  try {
    after(task);
  } catch {
    task();
  }
}

export function notifyUser(userId, payload) {
  if (userId) send((entry) => entry.userId === userId, payload);
}

export function notifyRole(role, payload) {
  // The kitchen tablet hears everything the kitchen staff hear.
  const roles = role === "staff" ? ["staff", "kitchen-tablet"] : [role];
  send((entry) => roles.includes(entry.role), payload);
}

/** Forgets every device of one user (used when they delete their account). */
export function removeSubscriptionsFor(userId) {
  writeJson(STORE, load().filter((entry) => String(entry.userId) !== String(userId)));
}
