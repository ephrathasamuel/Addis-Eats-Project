import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

function copyRefreshCookies(from, to) {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie);
  }
  for (const name of ["cache-control", "expires", "pragma"]) {
    const value = from.headers.get(name);
    if (value) to.headers.set(name, value);
  }
}

export async function proxy(request) {
  const config = getSupabaseConfig();
  const hasLocalSession = request.cookies.has("addis_session") || request.cookies.has("user_role");
  const pathname = request.nextUrl.pathname;
  const isApiRequest = pathname.startsWith("/api/");
  const isOptionalProfilePage = pathname === "/profile";

  if (!config) {
    if (!hasLocalSession && !isApiRequest && !isOptionalProfilePage) {
      const signInUrl = new URL("/signin", request.url);
      signInUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(signInUrl);
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.url, config.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([name, value]) => {
          response.headers.set(name, value);
        });
      },
    },
  });

  let data = null;
  try {
    const claimsRes = await supabase.auth.getClaims();
    data = claimsRes.data;
  } catch {}

  const isAuthenticated = Boolean(data?.claims?.sub || hasLocalSession);
  if (!isAuthenticated && !isApiRequest && !isOptionalProfilePage) {
    const signInUrl = new URL("/signin", request.url);
    signInUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    const redirectResponse = NextResponse.redirect(signInUrl);
    copyRefreshCookies(response, redirectResponse);
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    "/checkout/:path*",
    "/orders/:path*",
    "/profile/:path*",
    "/kitchen/:path*",
    "/delivery/:path*",
    "/admin/:path*",
    "/track/:path*",
    "/api/auth/:path*",
    "/api/orders/:path*",
  ],
};
