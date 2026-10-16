import { cookies } from "next/headers";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const SESSION_COOKIE = "addis_session";

if (!globalThis.__addis_sessions) {
  globalThis.__addis_sessions = new Map();
}
const SESSIONS = globalThis.__addis_sessions;

export async function getLocalSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    if (SESSIONS.has(token)) {
      return { ...SESSIONS.get(token), token };
    }
    if (token === "demo-session-customer") {
      return { id: "usr_almaz", name: "Almaz", email: "almaz@example.com", role: "customer", token };
    }
    if (token === "demo-session-staff") {
      return { id: "usr_chef_kassahun", name: "Chef Kassahun", email: "staff@addiseats.com", role: "staff", token };
    }
    if (token === "demo-session-admin") {
      return { id: "usr_admin", name: "System Admin", email: "admin@addiseats.com", role: "admin", token };
    }
    if (token === "demo-session-delivery") {
      return { id: "usr_courier_abebe", name: "Abebe Courier", email: "delivery@addiseats.com", role: "delivery", token };
    }
    if (typeof token === "string" && token.startsWith("sess_")) {
      try {
        const decoded = JSON.parse(Buffer.from(token.slice(5), "base64url").toString("utf8"));
        if (decoded?.id && decoded?.role) {
          SESSIONS.set(token, decoded);
          return { ...decoded, token };
        }
      } catch {}
    }
  }

  // Fallback to companion cookies
  const role = cookieStore.get("user_role")?.value;
  const name = cookieStore.get("user_name")?.value;
  const email = cookieStore.get("user_email")?.value;
  if (role && name) {
    const cleanName = decodeURIComponent(name);
    const cleanEmail = email ? decodeURIComponent(email) : `${role}@addiseats.com`;
    return {
      id: `usr_${cleanName.toLowerCase().replace(/\s+/g, "_")}`,
      name: cleanName,
      email: cleanEmail,
      role,
      token: token || `sess_${role}`,
    };
  }

  return null;
}

export async function getSession() {
  // If Supabase is configured, try Supabase session first
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!authError && user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", user.id)
          .maybeSingle();

        const role = profile?.role || "customer";
        return {
          id: user.id,
          name: profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
          email: user.email || "",
          role,
        };
      }
    } catch {
      // In case Supabase network fails or misconfigured, fallback to local session
    }
  }

  // Fallback to local session
  return getLocalSession();
}

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
    maxAge: 60 * 60 * 24 * 7,
  });

  cookieStore.set("user_name", encodeURIComponent(name), {
    httpOnly: false,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

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

export async function clearSession() {
  const cookieStore = await cookies();
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut({ scope: "local" });
    } catch {}
  }

  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) SESSIONS.delete(token);

  for (const cookie of cookieStore.getAll()) {
    if (cookie.name.startsWith("sb-") || cookie.name === SESSION_COOKIE) {
      cookieStore.delete(cookie.name);
    }
  }
  cookieStore.delete("user_name");
  cookieStore.delete("user_role");
  cookieStore.delete("user_email");
  cookieStore.delete("session");
  cookieStore.delete("order_owner");
  cookieStore.delete("last_order");
  cookieStore.delete("recent_orders");
}
