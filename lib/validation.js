// One schema, enforced in one place, called from both /api/orders (route.js)
// and placeOrder (actions.js) -  the same rule the browser already checked,
// checked again on the server, because anyone can curl it.

const PHONE_RE = /^09\d{8}$/;

export function validateOrder(data) {
  const fieldErrors = {};

  if (!data.name || String(data.name).trim().length < 2) {
    fieldErrors.name = "Enter a name of at least 2 characters.";
  }

  if (!data.phone || !PHONE_RE.test(String(data.phone))) {
    fieldErrors.phone = "Enter a valid Ethiopian mobile number (09XXXXXXXX).";
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
  if (!data.password || String(data.password).length < 6 || String(data.password).length > 256) {
    fieldErrors.password = "Password must be between 6 and 256 characters.";
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
    parsedLatitude < 8.5 ||
    parsedLatitude > 9.8 ||
    parsedLongitude < 38.2 ||
    parsedLongitude > 39.2
  ) {
    return false;
  }

  return { latitude: parsedLatitude, longitude: parsedLongitude };
}
