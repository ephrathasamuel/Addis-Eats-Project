import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const OTP_TYPES = new Set(["email", "email_change", "invite", "magiclink", "recovery", "signup"]);

function safeDestination(value) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/menu";
}

export async function GET(request) {
  const url = new URL(request.url);
  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(
      new URL("/signin?error=Supabase+authentication+is+not+configured.", url.origin)
    );
  }

  // Google / OAuth errors (e.g. the user closed the account chooser).
  if (url.searchParams.get("error")) {
    const detail = url.searchParams.get("error_description") || "";
    // Technical details go to the server log, not to the customer.
    console.warn("[addis-eats] Google sign-in error:", url.searchParams.get("error"), detail);
    const message =
      url.searchParams.get("error") === "access_denied"
        ? "Google sign-in was cancelled. Please try again."
        : "We couldn't finish signing you in with Google. Please try again in a moment, or sign in with email.";
    return NextResponse.redirect(new URL(`/signin?error=${encodeURIComponent(message)}`, url.origin));
  }

  const supabase = await createSupabaseServerClient();
  const code = url.searchParams.get("code");
  let error;

  if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else {
    const tokenHash = url.searchParams.get("token_hash");
    const type = url.searchParams.get("type");
    if (!tokenHash || !OTP_TYPES.has(type)) {
      return NextResponse.redirect(
        new URL("/signin?error=Email+confirmation+link+is+invalid+or+expired.", url.origin)
      );
    }
    ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type }));
  }

  if (error) {
    const passwordLink = url.searchParams.get("next") === "/reset-password";
    const message = passwordLink
      ? "That password link has expired or was opened in a different browser. Request a new one below."
      : "That sign-in link is invalid or expired. Please try again.";
    return NextResponse.redirect(new URL(`${passwordLink ? "/signin/forgot" : "/signin"}?error=${encodeURIComponent(message)}`, url.origin));
  }

  const response = NextResponse.redirect(new URL(safeDestination(url.searchParams.get("next")), url.origin));

  // First sign-in of a brand-new account (Google, or a just-confirmed email):
  // leave a short-lived note so the next page can say the account was created.
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const created = new Date(user.created_at).getTime();
    const lastSignIn = new Date(user.last_sign_in_at || user.created_at).getTime();
    const isNew = url.searchParams.get("type") === "signup" || (Date.now() - created < 10 * 60 * 1000 && lastSignIn - created < 60 * 1000);
    if (isNew) {
      response.cookies.set("addis_welcome", user.app_metadata?.provider === "google" ? "google" : "email", {
        path: "/",
        maxAge: 300,
        sameSite: "lax",
      });
    }
  }
  return response;
}
