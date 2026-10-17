import "server-only";
import crypto from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAccount } from "@/lib/accounts";
import { readJson, writeJson } from "@/lib/datastore";

// Two ways to be signed in:
// 1. A local account (all staff + admin, and customers when Supabase is off):
//    an HMAC-signed `addis_session` cookie that names the account and its
//    session version. Changing the password or deleting the account bumps or
//    removes the version, which invalidates every existing cookie.
// 2. A Supabase Auth session (customers, including Google sign-in).
// Nothing about identity or role is read from unsigned cookies.

export const SESSION_COOKIE = "addis_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 14;
const LEGACY_COOKIES = ["user_name", "user_role", "user_email", "session", "order_owner", "last_order", "recent_orders"];

function getSecret() {
  if (process.env.ADDIS_SESSION_SECRET) return process.env.ADDIS_SESSION_SECRET;
  if (process.env.VERCEL) {
    // Each Vercel instance has its own temp disk, so a generated secret would
    // differ between requests and sign people out. Derive a stable one from the
    // project instead, and ask for a real secret.
    if (!globalThis.__addis_session_secret) {
      console.warn("[addis-eats] ADDIS_SESSION_SECRET is not set; set it in Vercel > Settings > Environment Variables.");
      globalThis.__addis_session_secret = crypto
        .createHash("sha256")
        .update(`addis-eats:${process.env.VERCEL_PROJECT_ID || ""}:${process.env.NEXT_PUBLIC_SUPABASE_URL || ""}`)
        .digest("base64url");
    }
    return globalThis.__addis_session_secret;
  }
  if (!globalThis.__addis_session_secret) {
    let stored = readJson("session-secret.json", null);
    if (!stored?.secret) {
      stored = { secret: crypto.randomBytes(32).toString("base64url") };
      writeJson("session-secret.json", stored);
    }
    globalThis.__addis_session_secret = stored.secret;
  }
  return globalThis.__addis_session_secret;
}

function sign(payload) {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

function encodeToken(data) {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decodeToken(token) {
  if (typeof token !== "string" || !token.includes(".")) return null;
  const [payload, signature] = token.split(".");
  const expected = sign(payload);
  if (
    !signature ||
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data?.uid || Date.now() - Number(data.iat) > SESSION_MAX_AGE * 1000) return null;
    return data;
  } catch {
    return null;
  }
}

export function toSessionUser(account) {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role,
    phone: account.phone || "",
    photo: account.photo || "",
    provider: "local",
    mustChangePassword: Boolean(account.mustChangePassword),
  };
}

// On serverless hosting (Vercel) each request may reach a different server
// instance with its own copy of the account store, so an account created on
// one instance can be unknown to the next. The signed cookie therefore also
// carries the profile (name, email, role) and is trusted on its own there.
// Locally the store is always shared, so a missing account means it was
// removed and the cookie is rejected.
const STATELESS_SESSIONS = Boolean(process.env.VERCEL);

async function getLocalSession() {
  const cookieStore = await cookies();
  const data = decodeToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!data) return null;
  const account = getAccount(data.uid);
  if (account) {
    return (account.sessionVersion || 1) === data.v ? toSessionUser(account) : null;
  }
  if (!STATELESS_SESSIONS || !data.p?.role) return null;
  return {
    id: data.uid,
    name: data.p.name,
    email: data.p.email,
    role: data.p.role,
    phone: data.p.phone || "",
    photo: data.p.photo || "",
    provider: "local",
    mustChangePassword: false,
  };
}

async function getSupabaseSession() {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .maybeSingle();
    return {
      id: user.id,
      name:
        profile?.full_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "Customer",
      email: user.email || "",
      role: profile?.role || "customer",
      phone: "",
      photo: user.user_metadata?.avatar_url || "",
      provider: "supabase",
      // "email" for password accounts, "google" for Google sign-in.
      authMethod: user.app_metadata?.provider || "email",
    };
  } catch {
    return null;
  }
}

// Deduplicated per request: layouts, pages and actions can all call it freely.
export const getSession = cache(async () => {
  return (await getLocalSession()) || (await getSupabaseSession());
});

// Secure cookies are only sent over HTTPS. A kitchen tablet on the local
// network (http://192.168.x.x:3000) must still be able to sign in, so the
// flag follows the real request protocol instead of NODE_ENV.
async function isHttpsRequest() {
  const headerList = await headers();
  const proto = headerList.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return proto === "https";
}

export async function createSession(account) {
  const cookieStore = await cookies();
  const secure = await isHttpsRequest();
  cookieStore.set(
    SESSION_COOKIE,
    encodeToken({
      uid: account.id,
      v: account.sessionVersion || 1,
      iat: Date.now(),
      // Profile snapshot for serverless instances (see getLocalSession).
      // Inline data-URL photos are left out to keep the cookie small.
      p: {
        name: account.name,
        email: account.email,
        role: account.role,
        phone: account.phone || "",
        photo: account.photo && !account.photo.startsWith("data:") ? account.photo : "",
      },
    }),
    {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    }
  );
  for (const name of LEGACY_COOKIES) cookieStore.delete(name);
}

export async function clearSession() {
  const cookieStore = await cookies();
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut({ scope: "local" });
    } catch {}
  }
  for (const cookie of cookieStore.getAll()) {
    if (cookie.name.startsWith("sb-") || cookie.name === SESSION_COOKIE) {
      cookieStore.delete(cookie.name);
    }
  }
  for (const name of LEGACY_COOKIES) cookieStore.delete(name);
}
