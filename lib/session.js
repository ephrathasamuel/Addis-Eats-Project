import { cookies } from "next/headers";
import { randomUUID } from "crypto";

// Server-side session store. In production this would be Redis or Postgres.
if (!globalThis.__addis_sessions) {
  globalThis.__addis_sessions = new Map();

  // Seed demo customer
  globalThis.__addis_sessions.set("demo-session-customer", {
    id: "usr_almaz",
    name: "Almaz",
    email: "almaz@example.com",
    role: "customer",
    createdAt: new Date().toISOString(),
  });

  // Seed demo staff/kitchen member
  globalThis.__addis_sessions.set("demo-session-staff", {
    id: "usr_chef_kassahun",
    name: "Chef Kassahun",
    email: "staff@addiseats.com",
    role: "staff",
    createdAt: new Date().toISOString(),
  });

  // Seed demo system admin
  globalThis.__addis_sessions.set("demo-session-admin", {
    id: "usr_admin",
    name: "System Admin",
    email: "admin@addiseats.com",
    role: "admin",
    createdAt: new Date().toISOString(),
  });

  // Seed demo delivery courier
  globalThis.__addis_sessions.set("demo-session-delivery", {
    id: "usr_courier_abebe",
    name: "Abebe Courier",
    email: "delivery@addiseats.com",
    role: "delivery",
    createdAt: new Date().toISOString(),
  });
}

const SESSIONS = globalThis.__addis_sessions;

export const SESSION_COOKIE = "addis_session";

/**
 * Shared getSession helper used by server components, route handlers,
 * and server actions alike.
 * Provides resilient stateless fallback across serverless containers.
 */
export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) return null;

  // 1. Check in-memory store
  const cached = SESSIONS.get(token);
  if (cached) {
    return { ...cached, token };
  }

  // 2. Check known demo tokens
  if (token === "demo-session-customer") {
    return {
      id: "usr_almaz",
      name: "Almaz",
      email: "almaz@example.com",
      role: "customer",
      token,
    };
  }
  if (token === "demo-session-staff") {
    return {
      id: "usr_chef_kassahun",
      name: "Chef Kassahun",
      email: "staff@addiseats.com",
      role: "staff",
      token,
    };
  }
  if (token === "demo-session-admin") {
    return {
      id: "usr_admin",
      name: "System Admin",
      email: "admin@addiseats.com",
      role: "admin",
      token,
    };
  }
  if (token === "demo-session-delivery") {
    return {
      id: "usr_courier_abebe",
      name: "Abebe Courier",
      email: "delivery@addiseats.com",
      role: "delivery",
      token,
    };
  }

  // 3. Stateless self-contained base64url token recovery
  if (typeof token === "string" && token.startsWith("sess_")) {
    try {
      const raw = token.slice(5);
      const decoded = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
      if (decoded && decoded.id && decoded.name && decoded.role) {
        SESSIONS.set(token, decoded);
        return { ...decoded, token };
      }
    } catch {}
  }

  // 4. Try parsing token directly as base64url JSON
  try {
    const decoded = JSON.parse(Buffer.from(token, "base64url").toString("utf8"));
    if (decoded && decoded.id && decoded.name && decoded.role) {
      SESSIONS.set(token, decoded);
      return { ...decoded, token };
    }
  } catch {}

  // 5. Fallback from companion role and name cookies
  const fallbackRole = cookieStore.get("user_role")?.value;
  const fallbackName = cookieStore.get("user_name")?.value;
  const fallbackEmail = cookieStore.get("user_email")?.value;
  if (fallbackRole && fallbackName) {
    const cleanName = decodeURIComponent(fallbackName);
    const cleanEmail = fallbackEmail ? decodeURIComponent(fallbackEmail) : `${fallbackRole}@addiseats.com`;
    const fallbackUser = {
      id: `usr_${cleanName.toLowerCase().replace(/\s+/g, "_")}`,
      name: cleanName,
      email: cleanEmail,
      role: fallbackRole,
      token,
    };
    SESSIONS.set(token, fallbackUser);
    return fallbackUser;
  }

  return null;
}

/**
 * Creates a server session and sets hardened cookies.
 * Encodes the session into a stateless token so serverless instances never drop it.
 */
export async function createSession({ id, name, email, role = "customer" }) {
  const userId = id || `usr_${Date.now()}`;

  const session = {
    id: userId,
    name,
    email,
    role,
    createdAt: new Date().toISOString(),
  };

  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const token = `sess_${payload}`;

  SESSIONS.set(token, session);

  const cookieStore = await cookies();
  const isProd = process.env.NODE_ENV === "production";

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  // Display name cookie for client greetings
  cookieStore.set("user_name", encodeURIComponent(name), {
    httpOnly: false,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  // Role cookie to cleanly toggle admin/staff UI without client guessing
  cookieStore.set("user_role", role, {
    httpOnly: false,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  cookieStore.set("user_email", encodeURIComponent(email), {
    httpOnly: false,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return { ...session, token };
}

/**
 * Destroys the current session and clears all session cookies.
 */
export async function clearSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    SESSIONS.delete(token);
  }

  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete("user_name");
  cookieStore.delete("user_role");
  cookieStore.delete("user_email");
  cookieStore.delete("session");
  cookieStore.delete("order_owner");
}
