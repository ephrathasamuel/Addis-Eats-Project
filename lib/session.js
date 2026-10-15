import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import {
  createStoredSession,
  getStoredSession,
  revokeStoredSession,
} from "@/lib/auth-store";

export const SESSION_COOKIE = "addis_session";
const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token || !/^[A-Za-z0-9_-]{40,60}$/.test(token)) return null;
  return getStoredSession(token);
}

export async function createSession(user) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + SESSION_LIFETIME_MS;
  const sessionUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  createStoredSession(sessionUser, token, expiresAt);

  const cookieStore = await cookies();
  const isProd = process.env.NODE_ENV === "production";
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_LIFETIME_MS / 1000),
  });

  return { ...sessionUser, token };
}

export async function clearSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) revokeStoredSession(token);

  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete("user_name");
  cookieStore.delete("user_role");
  cookieStore.delete("user_email");
  cookieStore.delete("session");
  cookieStore.delete("order_owner");
  cookieStore.delete("last_order");
  cookieStore.delete("recent_orders");
}
