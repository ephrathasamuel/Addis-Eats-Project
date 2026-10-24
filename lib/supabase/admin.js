import "server-only";

// Server-only helpers that use the Supabase secret key. Never import this
// from client code.

function adminConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  return url && key?.startsWith("sb_secret_") ? { url, key } : null;
}

/**
 * Looks up a Supabase Auth user by email, to explain a failed sign-in
 * ("no account" vs "uses Google"). Returns { exists, providers } or null when
 * the lookup is unavailable.
 */
export async function findAuthUserByEmail(email) {
  const config = adminConfig();
  if (!config) return null;
  const target = String(email || "").trim().toLowerCase();
  try {
    for (let page = 1; page <= 20; page++) {
      const response = await fetch(`${config.url}/auth/v1/admin/users?page=${page}&per_page=1000`, {
        cache: "no-store",
        headers: { apikey: config.key, Authorization: `Bearer ${config.key}` },
      });
      if (!response.ok) return null;
      const { users = [] } = await response.json();
      const user = users.find((u) => (u.email || "").toLowerCase() === target);
      if (user) {
        const providers = new Set([
          ...(user.app_metadata?.providers || []),
          ...(user.identities || []).map((identity) => identity.provider),
        ]);
        return { exists: true, providers: [...providers] };
      }
      if (users.length < 1000) return { exists: false, providers: [] };
    }
    return null;
  } catch {
    return null;
  }
}

/** Deletes a Supabase Auth user (their profile row goes with it). Returns true on success. */
export async function deleteAuthUser(id) {
  const config = adminConfig();
  if (!config || !id) return false;
  try {
    const response = await fetch(`${config.url}/auth/v1/admin/users/${encodeURIComponent(id)}`, {
      method: "DELETE",
      cache: "no-store",
      headers: { apikey: config.key, Authorization: `Bearer ${config.key}` },
    });
    return response.ok;
  } catch {
    return false;
  }
}
