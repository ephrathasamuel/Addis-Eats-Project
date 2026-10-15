import { randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

const dataDirectory = process.env.ADDIS_DATA_DIR || path.join(process.cwd(), ".addis-data");
const storePath = path.join(dataDirectory, "auth.json");
const roles = ["customer", "staff", "delivery", "admin"];
const dummySalt = "addis-eats-password-verification";

function readStore() {
  try {
    const store = JSON.parse(readFileSync(storePath, "utf8"));
    return {
      users: Array.isArray(store.users) ? store.users : [],
      sessions: Array.isArray(store.sessions) ? store.sessions : [],
    };
  } catch (error) {
    if (error.code === "ENOENT") return { users: [], sessions: [] };
    throw new Error("Unable to read the authentication store.", { cause: error });
  }
}

function writeStore(store) {
  mkdirSync(dataDirectory, { recursive: true });
  const temporaryPath = `${storePath}.${randomUUID()}.tmp`;
  writeFileSync(temporaryPath, JSON.stringify(store), { encoding: "utf8", mode: 0o600 });
  renameSync(temporaryPath, storePath);
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

function hashPassword(password, salt = randomUUID()) {
  return {
    salt,
    hash: scryptSync(password, salt, 64).toString("hex"),
  };
}

function passwordMatches(password, salt, expectedHash) {
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, "hex");
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}

function configuredAccounts() {
  const definitions = [
    { role: "admin", prefix: "ADMIN", defaultName: "Administrator" },
    { role: "staff", prefix: "STAFF", defaultName: "Kitchen Staff" },
    { role: "delivery", prefix: "DELIVERY", defaultName: "Delivery Courier" },
  ];

  return definitions.flatMap(({ role, prefix, defaultName }) => {
    const email = process.env[`${prefix}_EMAIL`]?.trim().toLowerCase();
    const password = process.env[`${prefix}_PASSWORD`];
    if (!email && !password) return [];
    if (!email || !password || password.length < 12) {
      throw new Error(`${prefix}_EMAIL and a ${prefix}_PASSWORD of at least 12 characters must both be configured.`);
    }
    return [{
      id: `configured_${role}`,
      name: process.env[`${prefix}_NAME`]?.trim() || defaultName,
      email,
      password,
      role,
    }];
  });
}

export function createCustomerAccount({ name, email, password }) {
  const store = readStore();
  const normalizedEmail = email.trim().toLowerCase();
  if (
    store.users.some((user) => user.email === normalizedEmail) ||
    configuredAccounts().some((user) => user.email === normalizedEmail)
  ) {
    return { ok: false, error: "An account with this email already exists." };
  }

  const credentials = hashPassword(password);
  const user = {
    id: `usr_${randomUUID()}`,
    name: name.trim(),
    email: normalizedEmail,
    role: "customer",
    ...credentials,
  };
  store.users.push(user);
  writeStore(store);
  return { ok: true, user: publicUser(user) };
}

export function authenticateAccount(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const configured = configuredAccounts();
  const matches = configured.filter((account) => account.email === normalizedEmail);

  if (matches.length > 1) {
    throw new Error("Configured staff account emails must be unique.");
  }
  if (matches.length === 1) {
    const account = matches[0];
    const actual = Buffer.from(password);
    const expected = Buffer.from(account.password);
    const valid = actual.length === expected.length && timingSafeEqual(actual, expected);
    return valid ? publicUser(account) : null;
  }

  const user = readStore().users.find((candidate) => candidate.email === normalizedEmail);
  if (!user) {
    scryptSync(password, dummySalt, 64);
    return null;
  }

  if (!passwordMatches(password, user.salt, user.hash)) return null;
  return publicUser(user);
}

export function createStoredSession(user, token, expiresAt) {
  const store = readStore();
  store.sessions = store.sessions.filter((session) => session.expiresAt > Date.now());
  store.sessions.push({
    token,
    user: publicUser(user),
    expiresAt,
  });
  writeStore(store);
}

export function getStoredSession(token) {
  const store = readStore();
  const session = store.sessions.find((candidate) => candidate.token === token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    store.sessions = store.sessions.filter((candidate) => candidate.token !== token);
    writeStore(store);
    return null;
  }
  if (!session.user?.id || !session.user?.name || !session.user?.email || !roles.includes(session.user?.role)) {
    return null;
  }
  return { ...session.user, token };
}

export function revokeStoredSession(token) {
  const store = readStore();
  const remainingSessions = store.sessions.filter((session) => session.token !== token);
  if (remainingSessions.length !== store.sessions.length) {
    store.sessions = remainingSessions;
    writeStore(store);
  }
}
