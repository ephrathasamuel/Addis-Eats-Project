import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "@/lib/supabase/config";

export async function createSupabaseServerClient() {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error(
      "Supabase Auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local."
    );
  }

  const cookieStore = await cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch (error) {
          if (
            error?.message?.includes("Cookies can only be modified") ||
            error?.message?.includes("outside a Server Action or Route Handler")
          ) {
            return;
          }
          throw error;
        }
      },
    },
  });
}
