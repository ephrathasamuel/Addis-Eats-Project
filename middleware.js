import { NextResponse } from "next/server";

export function middleware(request) {
  const sessionToken = request.cookies.get("addis_session")?.value;
  const { pathname, search } = request.nextUrl;

  // Layer 1: Middleware route guard.
  // Checks for presence of session cookie at the edge before rendering the page.
  if (!sessionToken) {
    const signInUrl = new URL("/signin", request.url);
    const destination = `${pathname}${search}`;
    // Carry the intended destination in next param
    signInUrl.searchParams.set("next", destination);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

// Scoped matcher covering only protected private routes
export const config = {
  matcher: [
    "/checkout/:path*",
    "/orders/:path*",
    "/kitchen/:path*",
    "/admin/:path*",
  ],
};
