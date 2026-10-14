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

// Demo sign-in validation. This does NOT check the password against a real
// account database -  there isn't one. Any name/email/password that passes
// this shape check signs the visitor in. A production version would hash
// the password and compare it to a stored user record.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSignIn(data) {
  const fieldErrors = {};

  if (!data.name || String(data.name).trim().length < 2) {
    fieldErrors.name = "Enter your name.";
  }

  if (!data.email || !EMAIL_RE.test(String(data.email))) {
    fieldErrors.email = "Enter a valid email address.";
  }

  if (!data.password || String(data.password).length < 4) {
    fieldErrors.password = "Password must be at least 4 characters.";
  }

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
  };
}
