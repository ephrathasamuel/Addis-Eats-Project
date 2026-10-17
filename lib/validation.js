// One schema, enforced in one place, called from both /api/orders (route.js)
// and placeOrder (actions.js) -  the same rule the browser already checked,
// checked again on the server, because anyone can curl it.

import { isInAddis } from "./locations";

const PHONE_RE = /^(?:\+251|0)[79]\d{8}$/;

// Accepts 09XXXXXXXX, 07XXXXXXXX or +2519XXXXXXXX (spaces/dashes ignored) and
// returns the local 10-digit form, or null when invalid.
export function normalizeEthiopianPhone(value) {
  const cleaned = String(value || "").replace(/[\s-]/g, "");
  if (!PHONE_RE.test(cleaned)) return null;
  return cleaned.startsWith("+251") ? `0${cleaned.slice(4)}` : cleaned;
}

export function validateOrder(data) {
  const fieldErrors = {};

  if (!data.name || String(data.name).trim().length < 2 || String(data.name).trim().length > 80) {
    fieldErrors.name = "Enter a name of 2 to 80 characters.";
  }

  if (!normalizeEthiopianPhone(data.phone)) {
    fieldErrors.phone = "Enter a valid Ethiopian mobile number (e.g. 0912345678).";
  }

  if (String(data.addressDetails || "").length > 300) {
    fieldErrors.addressDetails = "Keep address details under 300 characters.";
  }

  if (!Array.isArray(data.items) || data.items.length === 0) {
    fieldErrors.items = "Your cart is empty.";
  }

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSignIn(data) {
  const fieldErrors = {};

  if (!data.email || !EMAIL_RE.test(String(data.email))) {
    fieldErrors.email = "Enter a valid email address.";
  }

  if (!data.password || String(data.password).length < 1) {
    fieldErrors.password = "Enter your password.";
  }

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
  };
}

export function validateCustomerRegistration(data) {
  const fieldErrors = {};
  const name = String(data.name || "").trim();

  if (name.length < 2 || name.length > 80) {
    fieldErrors.name = "Name must be between 2 and 80 characters.";
  }
  if (!data.email || !EMAIL_RE.test(String(data.email))) {
    fieldErrors.email = "Enter a valid email address.";
  }
  if (!data.password || String(data.password).length < 8 || String(data.password).length > 256) {
    fieldErrors.password = "Password must be at least 8 characters.";
  }

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
  };
}

export function parseDeliveryCoordinates(latitude, longitude) {
  const hasLatitude = latitude !== undefined && latitude !== null && String(latitude).trim() !== "";
  const hasLongitude = longitude !== undefined && longitude !== null && String(longitude).trim() !== "";
  if (!hasLatitude && !hasLongitude) return null;
  if (!hasLatitude || !hasLongitude) return false;

  const parsedLatitude = Number(latitude);
  const parsedLongitude = Number(longitude);
  if (
    !Number.isFinite(parsedLatitude) ||
    !Number.isFinite(parsedLongitude) ||
    !isInAddis(parsedLatitude, parsedLongitude)
  ) {
    return false;
  }

  return { latitude: parsedLatitude, longitude: parsedLongitude };
}
