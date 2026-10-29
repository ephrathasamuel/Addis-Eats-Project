import "server-only";
import crypto from "node:crypto";

// Online payment through Chapa (telebirr, CBE Birr, cards).
// Switched on only when CHAPA_SECRET_KEY is set; without it the app is cash on
// delivery exactly as before. ADDIS_PAYMENTS=off switches it off even with a key.
//
// Two Chapa APIs are supported, picked from the key:
//   v2 (current dashboard, keys like CHAPA_TEST_PRIV_… / CHAPA_PRIV_…):
//      https://api.chapa.global/v2, amounts in cents, Idempotency-Key header
//   v1 (older keys like CHASECK_TEST-…): https://api.chapa.co/v1
//
// Never trust what the browser or a callback says: every payment is checked
// with Chapa's verify endpoint using the private key before an order is paid.

function chapaConfig() {
  if (process.env.ADDIS_PAYMENTS === "off") return null;
  const key = process.env.CHAPA_SECRET_KEY?.trim().replace(/^["']|["']$/g, "");
  if (!key) return null;
  // Public and encryption keys can't take payments on the server.
  if (/^CHAPUBK|^CHAPA_(TEST_)?(PUB|ENC)/i.test(key)) return null;
  if (/^CHASECK(_TEST)?-/.test(key)) {
    // CHAPA_V1_API_URL lets tests point this at a stand-in server.
    const api = (process.env.CHAPA_V1_API_URL || "https://api.chapa.co/v1").replace(/\/$/, "");
    return { key, version: 1, api, testMode: key.startsWith("CHASECK_TEST-") };
  }
  if (/^CHAPA_/.test(key)) {
    // CHAPA_API_URL lets tests point this at a stand-in server.
    const api = (process.env.CHAPA_API_URL || "https://api.chapa.global").replace(/\/$/, "");
    return { key, version: 2, api, testMode: /^CHAPA_TEST/.test(key) };
  }
  return null;
}

export function isOnlinePaymentEnabled() {
  return Boolean(chapaConfig());
}

export function isTestMode() {
  return Boolean(chapaConfig()?.testMode);
}

async function chapa(path, init = {}) {
  const { key, api } = chapaConfig();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${api}${path}`, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers || {}) },
    });
    const body = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, body };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * A fresh, unique reference for one payment attempt of an order. Chapa v2
 * allows at most 20 characters ("a1020x" + 8 hex = 14 for a 4-digit order).
 */
export function newPaymentReference(orderId) {
  return `a${orderId}x${crypto.randomBytes(4).toString("hex")}`;
}

/** The order id inside a payment reference (new and older formats), or null. */
export function orderIdFromReference(reference) {
  const match = /^(?:a(\d+)x[0-9a-f]{8}|addis-(\d+)-[0-9a-f]{12})$/.exec(String(reference || ""));
  return match ? match[1] || match[2] : null;
}

const phoneForChapa = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("251")) return `0${digits.slice(3)}`;
  return digits.startsWith("0") ? digits : `0${digits}`;
};

// Chapa only sends customers back to (and calls) https addresses. The PC
// version on the local network is plain http, so there the customer returns
// to the order page by hand and "Check again" confirms the payment.
const usableUrl = (url) =>
  url && (url.startsWith("https://") || process.env.CHAPA_ALLOW_HTTP_RETURN === "1") ? url : undefined;

/**
 * Starts a payment. Returns { ok: true, checkoutUrl } or { ok: false, error }.
 */
export async function startPayment({ order, reference, email, returnUrl, callbackUrl }) {
  const config = chapaConfig();
  if (!config) return { ok: false, error: "Online payment is not set up." };
  const [firstName, ...rest] = String(order.name || "Customer").trim().split(/\s+/);
  try {
    const { ok, body } =
      config.version === 2
        ? await chapa("/v2/payments/hosted", {
            method: "POST",
            headers: { "Idempotency-Key": reference },
            body: JSON.stringify({
              amount: Math.round(Number(order.total) * 100),
              currency: "ETB",
              merchant_reference: reference,
              // No "customer" object: with one, Chapa's verify endpoint answers
              // "Customer not found" once the payment is complete (seen in
              // test mode, October 2026). The customer types their phone on
              // Chapa's page anyway.
              return_url: usableUrl(returnUrl),
              callback_url: usableUrl(callbackUrl),
              meta: { order_id: String(order.id) },
              customization: { title: "Addis Eats", description: `Order ${order.id}` },
            }),
          })
        : await chapa("/transaction/initialize", {
            method: "POST",
            body: JSON.stringify({
              amount: String(order.total),
              currency: "ETB",
              email: email || undefined,
              first_name: firstName || "Customer",
              last_name: rest.join(" ") || "-",
              phone_number: phoneForChapa(order.phone),
              tx_ref: reference,
              callback_url: usableUrl(callbackUrl),
              return_url: usableUrl(returnUrl),
              customization: { title: "Addis Eats", description: `Order ${order.id}` },
            }),
          });
    const checkoutUrl = body?.data?.checkout_url;
    if (!ok || !checkoutUrl) {
      console.warn("[addis-eats] Chapa did not start the payment:", body?.message || body?.error || "no checkout link");
      return { ok: false, error: "Online payment isn't available right now." };
    }
    return { ok: true, checkoutUrl };
  } catch (error) {
    console.warn("[addis-eats] Could not reach Chapa:", error.message);
    return { ok: false, error: "Online payment isn't available right now." };
  }
}

/**
 * Asks Chapa whether a payment went through.
 * Returns { paid: true, amount, method } / { paid: false, status } / null when Chapa can't be reached.
 */
export async function checkPayment(reference, expectedAmount) {
  const config = chapaConfig();
  if (!config || !reference) return null;
  try {
    const path =
      config.version === 2
        ? `/v2/payments/${encodeURIComponent(reference)}/verify`
        : `/transaction/verify/${encodeURIComponent(reference)}`;
    let { ok, status, body } = await chapa(path);
    if (!ok && config.version === 2 && status >= 400 && status < 500) {
      // Backup: find Chapa's own reference for our payment in the payment list
      // and verify by that. The answer must still name our reference (below).
      const list = await chapa(`/v2/payments?merchant_reference=${encodeURIComponent(reference)}`);
      const item = (list.body?.data?.items || []).find((entry) => entry.merchant_reference === reference);
      if (item?.chapa_reference) {
        ({ ok, status, body } = await chapa(`/v2/payments/${encodeURIComponent(item.chapa_reference)}/verify`));
      }
    }
    if (!ok) return status === 404 || status === 400 ? { paid: false, status: "not-found" } : null;
    const data = body?.data || {};
    const success = String(data.status || "").toLowerCase() === "success";
    const currencyOk = String(data.currency || "ETB").toUpperCase() === "ETB";
    // v2 amounts are in cents; v1 amounts are in birr.
    const amountBirr = config.version === 2 ? Number(data.amount) / 100 : Number(data.amount);
    const referenceOk =
      config.version === 2
        ? String(data.merchant_reference || reference) === reference
        : String(data.tx_ref || reference) === reference;
    const matches = success && currencyOk && referenceOk && Number.isFinite(amountBirr) && amountBirr + 0.001 >= Number(expectedAmount);
    return matches
      ? {
          paid: true,
          amount: amountBirr,
          method: data.payment_method || data.method || "",
          chapaReference: data.chapa_reference || data.reference || "",
        }
      : { paid: false, status: String(data.status || "pending").toLowerCase() };
  } catch (error) {
    console.warn("[addis-eats] Could not verify a Chapa payment:", error.message);
    return null;
  }
}

/**
 * Checks a webhook's x-chapa-signature (HMAC-SHA256 of the raw body with
 * CHAPA_WEBHOOK_SECRET). Without a configured secret it returns true: the
 * payment is still verified with Chapa before anything changes.
 */
export function webhookSignatureOk(rawBody, signature) {
  const secret = process.env.CHAPA_WEBHOOK_SECRET?.trim();
  if (!secret) return true;
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const given = String(signature).trim().toLowerCase();
  return given.length === expected.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

// Chapa's hosted checkout pages. The app only ever opens or links to pages on
// these hosts; in tests CHAPA_API_URL's host is allowed too.
function checkoutHosts() {
  const hosts = ["checkout.chapa.global", "checkout.chapa.co"];
  try {
    if (process.env.CHAPA_API_URL) hosts.push(new URL(process.env.CHAPA_API_URL).host);
  } catch {}
  return hosts;
}

export function isChapaCheckoutUrl(url) {
  try {
    const parsed = new URL(url);
    return checkoutHosts().includes(parsed.host) && (parsed.protocol === "https:" || Boolean(process.env.CHAPA_API_URL));
  } catch {
    return false;
  }
}
