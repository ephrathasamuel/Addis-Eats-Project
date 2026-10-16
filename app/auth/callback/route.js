import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const OTP_TYPES = new Set(["email", "email_change", "invite", "magiclink", "recovery", "signup"]);

function safeDestination(value) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/orders";
}

export async function GET(request) {
  const url = new URL(request.url);
  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(
      new URL("/signin?error=Supabase+authentication+is+not+configured.", url.origin)
    );
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
    return NextResponse.redirect(
      new URL("/signin?error=Email+confirmation+failed.+Request+a+new+confirmation+email.", url.origin)
    );
  }

  return NextResponse.redirect(new URL(safeDestination(url.searchParams.get("next")), url.origin));
}
