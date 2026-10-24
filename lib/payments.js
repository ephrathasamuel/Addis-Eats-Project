import "server-only";
import crypto from "node:crypto";

// Online payment through Chapa (telebirr, CBE Birr, Awash Birr, cards).
// Switched on only when CHAPA_SECRET_KEY is set; without it the app is cash on
// delivery exactly as before. ADDIS_PAYMENTS=off switches it off even with a key.
//
// Never trust what the browser or a callback says: every payment is checked
// with Chapa's verify endpoint using the secret key before an order is paid.

function chapaConfig() {
  if (process.env.ADDIS_PAYMENTS === "off") return null;
  const key = process.env.CHAPA_SECRET_KEY?.trim();
  if (!key || !/^CHASECK(_TEST)?-/.test(key)) return null;
  // CHAPA_API_URL lets tests point this at a stand-in server.
  const api = (process.env.CHAPA_API_URL || "https://api.chapa.co/v1").replace(/\/$/, "");
  return { key, api, testMode: key.startsWith("CHASECK_TEST-") };
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

/** A fresh, unique reference for one payment attempt of an order. */
export function newPaymentReference(orderId) {
  return `addis-${orderId}-${crypto.randomBytes(6).toString("hex")}`;
}

const PHONE_FOR_CHAPA = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("251")) return `0${digits.slice(3)}`;
  return digits.startsWith("0") ? digits : `0${digits}`;
};

/**
 * Starts a payment. Returns { ok: true, checkoutUrl } or { ok: false, error }.
 */
export async function startPayment({ order, reference, email, returnUrl, callbackUrl }) {
  if (!chapaConfig()) return { ok: false, error: "Online payment is not set up." };
  const [firstName, ...rest] = String(order.name || "Customer").trim().split(/\s+/);
  try {
    const { ok, body } = await chapa("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        amount: String(order.total),
        currency: "ETB",
        email: email || undefined,
        first_name: firstName || "Customer",
        last_name: rest.join(" ") || "-",
        phone_number: PHONE_FOR_CHAPA(order.phone),
        tx_ref: reference,
        callback_url: callbackUrl,
        return_url: returnUrl,
        customization: { title: "Addis Eats", description: `Order ${order.id}` },
      }),
    });
    const checkoutUrl = body?.data?.checkout_url;
    if (!ok || !checkoutUrl) {
      console.warn("[addis-eats] Chapa did not start the payment:", body?.message || "no checkout link");
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
  if (!chapaConfig() || !reference) return null;
  try {
    const { ok, status, body } = await chapa(`/transaction/verify/${encodeURIComponent(reference)}`);
    if (!ok) return status === 404 || status === 400 ? { paid: false, status: "not-found" } : null;
    const data = body?.data || {};
    const success = String(data.status || "").toLowerCase() === "success";
    const amount = Number(data.amount);
    const matches =
      success &&
      String(data.tx_ref || reference) === reference &&
      String(data.currency || "ETB").toUpperCase() === "ETB" &&
      Number.isFinite(amount) &&
      amount + 0.001 >= Number(expectedAmount);
    return matches
      ? { paid: true, amount, method: data.method || data.payment_method || "", chapaReference: data.reference || "" }
      : { paid: false, status: String(data.status || "pending").toLowerCase() };
  } catch (error) {
    console.warn("[addis-eats] Could not verify a Chapa payment:", error.message);
    return null;
  }
}
