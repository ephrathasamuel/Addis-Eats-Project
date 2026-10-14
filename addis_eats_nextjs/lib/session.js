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
}

const SESSIONS = globalThis.__addis_sessions;

export const SESSION_COOKIE = "addis_session";

/**
 * Shared getSession helper used by server components, route handlers,
 * and server actions alike.
 */
export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) return null;

  const session = SESSIONS.get(token);
  if (!session) return null;

  return { ...session, token };
}

/**
 * Creates a server session and sets hardened cookies.
 */
export async function createSession({ id, name, email, role = "customer" }) {
  const token = randomUUID();
  const userId = id || `usr_${Date.now()}`;

  const session = {
    id: userId,
    name,
    email,
    role,
    createdAt: new Date().toISOString(),
  };

  SESSIONS.set(token, session);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  // Display name cookie for client greetings
  cookieStore.set("user_name", encodeURIComponent(name), {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  // Role cookie to cleanly toggle admin/staff UI without client guessing
  cookieStore.set("user_role", role, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  cookieStore.set("user_email", encodeURIComponent(email), {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
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
