import "server-only";
import crypto from "node:crypto";
import { readJson, writeJson } from "@/lib/datastore";

// Local account store for restaurant staff (admin, kitchen, delivery) and, when
// Supabase is not configured, customers. Staff accounts can only be created by
// an admin; there is no public staff sign-up.

const STORE = "accounts.json";
export const STAFF_ROLES = ["staff", "delivery"];
export const ROLES = ["customer", "staff", "delivery", "admin"];

export const DEFAULT_ADMIN_EMAIL = "admin@addiseats.com";
export const DEFAULT_ADMIN_PASSWORD = "ChangeMe-Admin1";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PIN_RE = /^\d{4,6}$/;
const PHONE_RE = /^(?:\+251|0)[79]\d{8}$/;

function load() {
  if (!globalThis.__addis_accounts) {
    const list = readJson(STORE, []);
    globalThis.__addis_accounts = Array.isArray(list) ? list : [];
    ensureAdmin();
  }
  return globalThis.__addis_accounts;
}

function save() {
  writeJson(STORE, globalThis.__addis_accounts);
}

function ensureAdmin() {
  const accounts = globalThis.__addis_accounts;
  if (accounts.some((account) => account.role === "admin")) return;
  const envEmail = process.env.ADDIS_ADMIN_EMAIL?.trim().toLowerCase();
  const envPassword = process.env.ADDIS_ADMIN_PASSWORD;
  const usingDefaults = !envEmail || !envPassword;
  accounts.push({
    id: `usr_admin_${crypto.randomUUID().slice(0, 8)}`,
    role: "admin",
    name: "Restaurant Admin",
    email: usingDefaults ? DEFAULT_ADMIN_EMAIL : envEmail,
    phone: "",
    photo: "",
    passwordHash: hashSecret(usingDefaults ? DEFAULT_ADMIN_PASSWORD : envPassword),
    mustChangePassword: usingDefaults,
    sessionVersion: 1,
    createdAt: new Date().toISOString(),
  });
  save();
  if (usingDefaults) {
    console.warn(
      `[addis-eats] Created default admin ${DEFAULT_ADMIN_EMAIL}. Sign in and change its password, or set ADDIS_ADMIN_EMAIL and ADDIS_ADMIN_PASSWORD before first start.`
    );
  }
}

// ---------- hashing ----------

export function hashSecret(secret) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(secret), salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

function verifySecret(secret, stored) {
  if (typeof stored !== "string" || !stored.startsWith("scrypt$")) return false;
  const [, saltB64, hashB64] = stored.split("$");
  const expected = Buffer.from(hashB64, "base64");
  const actual = crypto.scryptSync(String(secret), Buffer.from(saltB64, "base64"), expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

// ---------- brute-force throttling (per process) ----------

const attempts = globalThis.__addis_auth_attempts || (globalThis.__addis_auth_attempts = new Map());
const MAX_FAILURES = 6;
const LOCK_MS = 10 * 60 * 1000;

function isLocked(key) {
  const entry = attempts.get(key);
  return Boolean(entry && entry.lockedUntil && entry.lockedUntil > Date.now());
}

function recordFailure(key) {
  const entry = attempts.get(key) || { failures: 0 };
  entry.failures += 1;
  if (entry.failures >= MAX_FAILURES) {
    entry.lockedUntil = Date.now() + LOCK_MS;
    entry.failures = 0;
  }
  attempts.set(key, entry);
}

// ---------- public shape ----------

export function toPublicAccount(account) {
  if (!account) return null;
  return {
    id: account.id,
    role: account.role,
    name: account.name,
    email: account.email,
    phone: account.phone || "",
    photo: account.photo || "",
    hasPin: Boolean(account.pinHash),
    mustChangePassword: Boolean(account.mustChangePassword),
    createdAt: account.createdAt,
  };
}

// ---------- queries ----------

export function getAccount(id) {
  if (!id) return null;
  return load().find((account) => account.id === id) || null;
}

export function findAccountByEmail(email) {
  const normalized = String(email || "").trim().toLowerCase();
  return load().find((account) => account.email === normalized) || null;
}

export function listStaff(role) {
  return load()
    .filter((account) => (role ? account.role === role : STAFF_ROLES.includes(account.role)))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(toPublicAccount);
}

// ---------- authentication ----------

// Returns { ok, account } or { ok: false, error }.
export function authenticate(email, password) {
  const key = `login:${String(email || "").trim().toLowerCase()}`;
  if (isLocked(key)) {
    return { ok: false, error: "Too many failed attempts. Try again in a few minutes." };
  }
  const account = findAccountByEmail(email);
  if (!account || !verifySecret(password, account.passwordHash)) {
    recordFailure(key);
    return { ok: false, error: "Incorrect email or password." };
  }
  attempts.delete(key);
  return { ok: true, account };
}

export function verifyPin(staffId, pin) {
  const key = `pin:${staffId}`;
  if (isLocked(key)) {
    return { ok: false, error: "Too many wrong PINs. This cook is locked for 10 minutes." };
  }
  const account = getAccount(staffId);
  if (!account || account.role !== "staff" || !account.pinHash) {
    return { ok: false, error: "That kitchen staff member does not have a PIN set." };
  }
  if (!PIN_RE.test(String(pin || "")) || !verifySecret(pin, account.pinHash)) {
    recordFailure(key);
    return { ok: false, error: "Wrong PIN." };
  }
  attempts.delete(key);
  return { ok: true, account };
}

// ---------- validation ----------

export function validatePassword(password) {
  const value = String(password || "");
  if (value.length < 8 || value.length > 256) return "Password must be at least 8 characters.";
  return null;
}

export function validatePin(pin) {
  return PIN_RE.test(String(pin || "")) ? null : "PIN must be 4 to 6 digits.";
}

export function normalizePhone(phone) {
  return String(phone || "").replace(/[\s-]/g, "");
}

// ---------- mutations ----------

// Creates a local account. Returns { ok, account } or { ok: false, fieldErrors }.
export function createAccount({ role, name, email, phone, photo = "", password, pin }) {
  const fieldErrors = {};
  const cleanName = String(name || "").trim();
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanPhone = normalizePhone(phone);

  if (!ROLES.includes(role) || role === "admin") fieldErrors.role = "Choose kitchen staff or delivery.";
  if (cleanName.length < 2 || cleanName.length > 80) fieldErrors.name = "Enter the full name (2-80 characters).";
  if (!EMAIL_RE.test(cleanEmail)) fieldErrors.email = "Enter a valid email address.";
  else if (findAccountByEmail(cleanEmail)) fieldErrors.email = "An account with this email already exists.";
  const passwordError = validatePassword(password);
  if (passwordError) fieldErrors.password = passwordError;

  if (STAFF_ROLES.includes(role)) {
    if (!PHONE_RE.test(cleanPhone)) fieldErrors.phone = "Enter a valid Ethiopian phone number (09XXXXXXXX).";
  }
  if (role === "delivery" && !photo) fieldErrors.photo = "Couriers need a profile photo so customers can recognise them.";
  if (role === "staff") {
    const pinError = validatePin(pin);
    if (pinError) fieldErrors.pin = pinError;
  }

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  const account = {
    id: `usr_${role}_${crypto.randomUUID().slice(0, 12)}`,
    role,
    name: cleanName,
    email: cleanEmail,
    phone: cleanPhone,
    photo,
    passwordHash: hashSecret(password),
    pinHash: role === "staff" ? hashSecret(pin) : undefined,
    sessionVersion: 1,
    createdAt: new Date().toISOString(),
  };
  load().push(account);
  save();
  return { ok: true, account };
}

export function updateProfile(id, { name, phone, photo }) {
  const account = getAccount(id);
  if (!account) return { ok: false, error: "Account not found." };
  const fieldErrors = {};
  if (name !== undefined) {
    const cleanName = String(name).trim();
    if (cleanName.length < 2 || cleanName.length > 80) fieldErrors.name = "Enter the full name (2-80 characters).";
    else account.name = cleanName;
  }
  if (phone !== undefined) {
    const cleanPhone = normalizePhone(phone);
    if (cleanPhone && !PHONE_RE.test(cleanPhone)) fieldErrors.phone = "Enter a valid Ethiopian phone number.";
    else account.phone = cleanPhone;
  }
  if (photo) account.photo = photo;
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  account.updatedAt = new Date().toISOString();
  save();
  return { ok: true, account };
}

// Changing a password signs out every other session for that account.
export function setPassword(id, password) {
  const account = getAccount(id);
  if (!account) return { ok: false, error: "Account not found." };
  const error = validatePassword(password);
  if (error) return { ok: false, error };
  account.passwordHash = hashSecret(password);
  account.mustChangePassword = false;
  account.sessionVersion = (account.sessionVersion || 1) + 1;
  account.updatedAt = new Date().toISOString();
  save();
  return { ok: true, account };
}

export function changeOwnPassword(id, currentPassword, newPassword) {
  const account = getAccount(id);
  if (!account) return { ok: false, error: "Account not found." };
  if (!verifySecret(currentPassword, account.passwordHash)) {
    return { ok: false, error: "Your current password is incorrect." };
  }
  return setPassword(id, newPassword);
}

export function setPin(id, pin) {
  const account = getAccount(id);
  if (!account || account.role !== "staff") return { ok: false, error: "Only kitchen staff have PINs." };
  const error = validatePin(pin);
  if (error) return { ok: false, error };
  account.pinHash = hashSecret(pin);
  account.updatedAt = new Date().toISOString();
  save();
  attempts.delete(`pin:${id}`);
  return { ok: true };
}

export function removeAccount(id) {
  const accounts = load();
  const index = accounts.findIndex((account) => account.id === id);
  if (index === -1) return { ok: false, error: "Account not found." };
  if (accounts[index].role === "admin") return { ok: false, error: "Admin accounts cannot be removed here." };
  accounts.splice(index, 1);
  save();
  return { ok: true };
}
