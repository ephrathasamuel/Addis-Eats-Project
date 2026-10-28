import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

// Staff areas use their own sign-in page, separate from customers.
const STAFF_AREAS = ["/admin", "/kitchen", "/delivery", "/dashboard"];
function signInPathFor(pathname) {
  return STAFF_AREAS.some((area) => pathname === area || pathname.startsWith(`${area}/`)) ? "/staff/signin" : "/signin";
}

// Paths that need a signed-in user (and a refreshed Supabase session).
const PROTECTED = ["/checkout", "/orders", "/profile", "/kitchen", "/delivery", "/admin", "/track", "/api/auth", "/api/orders"];
const isProtected = (pathname) => PROTECTED.some((area) => pathname === area || pathname.startsWith(`${area}/`));

// ---------------------------------------------------------------------------
// Content Security Policy: only scripts carrying this request's random nonce
// (Next.js adds it to its own scripts) may run, so injected scripts can't.
// ADDIS_CSP=off turns it off, ADDIS_CSP=report only reports problems.
// ---------------------------------------------------------------------------

function originOf(url) {
  try {
    return url ? new URL(url).origin : "";
  } catch {
    return "";
  }
}

function buildCsp(nonce) {
  const isDev = process.env.NODE_ENV === "development";
  const supabase = originOf(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const storage = originOf(process.env.ADDIS_DB_URL) || supabase;
  const sources = [...new Set([supabase, storage].filter(Boolean))].join(" ");
  const sockets = supabase ? supabase.replace(/^http/, "ws") : "";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // React and the map set style attributes, so inline styles stay allowed.
    "style-src 'self' 'unsafe-inline'",
    // Dish photos, Google profile pictures, map tiles, stored photos.
    `img-src 'self' data: blob: https: ${storage}`.trim(),
    "font-src 'self' data:",
    `connect-src 'self' ${sources} ${sockets}`.trim(),
    "worker-src 'self'",
    "manifest-src 'self'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    `form-action 'self' ${supabase} https://accounts.google.com https://checkout.chapa.co`.trim(),
    "frame-ancestors 'none'",
  ].join("; ");
}

function cspMode() {
  const mode = (process.env.ADDIS_CSP || "on").toLowerCase();
  return mode === "off" ? "off" : mode === "report" ? "report" : "on";
}
const cspHeaderName = () => (cspMode() === "report" ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy");

// Request headers for rendering: Next reads the nonce from them.
function requestHeadersWith(request, csp, nonce) {
  const headers = new Headers(request.headers);
  if (csp) {
    headers.set("x-nonce", nonce);
    headers.set("Content-Security-Policy", csp);
  }
  return headers;
}

function withCsp(response, csp) {
  if (csp) response.headers.set(cspHeaderName(), csp);
  return response;
}

function copyRefreshCookies(from, to) {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie);
  }
  for (const name of ["cache-control", "expires", "pragma"]) {
    const value = from.headers.get(name);
    if (value) to.headers.set(name, value);
  }
}

// A kitchen tablet stays on the tablet board (the session itself also limits
// what it can do; this just keeps people from wandering off it).
const TABLET_PAGES = ["/kitchen/tablet", "/menu"];
const isTabletPage = (pathname) => TABLET_PAGES.some((area) => pathname === area || pathname.startsWith(`${area}/`));

export async function proxy(request) {
  const pathname = request.nextUrl.pathname;
  if (request.cookies.get("addis_kitchen_tablet")?.value === "1" && !pathname.startsWith("/api/") && !isTabletPage(pathname)) {
    return NextResponse.redirect(new URL("/kitchen/tablet", request.url));
  }
  const isApiRequest = pathname.startsWith("/api/");
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  // API responses are data, not pages: no policy needed there.
  const csp = cspMode() === "off" || isApiRequest ? "" : buildCsp(nonce);

  // Public pages: just add the policy.
  if (!isProtected(pathname)) {
    return withCsp(NextResponse.next({ request: { headers: requestHeadersWith(request, csp, nonce) } }), csp);
  }

  const config = getSupabaseConfig();
  // Only checks that some session cookie exists; pages and actions verify it.
  const hasLocalSession = request.cookies.has("addis_session");
  // The tablet page shows its own sign-in when the device isn't set up yet.
  const isOptionalProfilePage = pathname === "/profile" || pathname === "/kitchen/tablet";

  if (!config) {
    if (!hasLocalSession && !isApiRequest && !isOptionalProfilePage) {
      const signInUrl = new URL(signInPathFor(pathname), request.url);
      signInUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(signInUrl);
    }
    // Pass headers only: passing the whole request object (`{ request }`)
    // made Next 16 answer every matched Route Handler (/api/...) with a 404.
    return withCsp(NextResponse.next({ request: { headers: requestHeadersWith(request, csp, nonce) } }), csp);
  }

  // Forward only the (possibly refreshed) request headers, as the Next docs show.
  let response = NextResponse.next({ request: { headers: requestHeadersWith(request, csp, nonce) } });
  const supabase = createServerClient(config.url, config.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: requestHeadersWith(request, csp, nonce) } });
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
    const signInUrl = new URL(signInPathFor(pathname), request.url);
    signInUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    const redirectResponse = NextResponse.redirect(signInUrl);
    copyRefreshCookies(response, redirectResponse);
    return redirectResponse;
  }

  return withCsp(response, csp);
}

export const config = {
  matcher: [
    // Every page and API route except build assets and static files.
    "/((?!_next/static|_next/image|favicon.ico|images/|media/|sw.js|manifest.webmanifest|robots.txt|sitemap.xml|opengraph-image).*)",
  ],
};
