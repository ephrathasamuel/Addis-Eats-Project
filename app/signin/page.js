import { redirect } from "next/navigation";
import Link from "next/link";
import { signIn, signUp } from "@/app/actions";
import PasswordInput from "@/components/PasswordInput";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import SubmitButton from "@/components/SubmitButton";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign in",
  robots: { index: false },
};

const ROLE_HOME = { admin: "/admin", staff: "/kitchen", delivery: "/delivery", customer: "/menu" };

export default async function SignInPage({ searchParams }) {
  const params = await searchParams;
  const next = typeof params?.next === "string" ? params.next : "";
  const registering = params?.mode === "register";

  const user = await getSession();
  if (user) redirect(ROLE_HOME[user.role] || "/menu");

  let fieldErrors = {};
  try {
    if (params?.error) fieldErrors = JSON.parse(params.error);
    if (typeof fieldErrors !== "object" || fieldErrors === null) fieldErrors = {};
  } catch {
    fieldErrors = {};
  }
  const authError = params?.error && Object.keys(fieldErrors).length === 0 ? params.error : null;
  const registered = params?.registered === "1";
  const googleEnabled = isSupabaseConfigured();
  const withNext = (path) => (next ? `${path}${path.includes("?") ? "&" : "?"}next=${encodeURIComponent(next)}` : path);

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: "440px" }}>
        <h1>{registering ? "Create account" : "Sign in"}</h1>
        <p className="auth-subtitle">
          {registering
            ? "Create a customer account to place and track orders."
            : "Customers and restaurant staff sign in here."}
        </p>

        <form action={registering ? signUp : signIn} key={registering ? "register" : "signin"}>
          <input type="hidden" name="next" value={next} />

          {registering && (
            <div className="field">
              <label htmlFor="name">Full name</label>
              <input
                id="name"
                name="name"
                defaultValue={params?.name || ""}
                placeholder="Enter your full name"
                required
                autoComplete="name"
              />
              {fieldErrors.name && <p className="field-error">{fieldErrors.name}</p>}
            </div>
          )}

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={params?.email || ""}
              placeholder="name@example.com"
              required
              autoComplete="email"
            />
            {fieldErrors.email && <p className="field-error">{fieldErrors.email}</p>}
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <PasswordInput
              id="password"
              placeholder={registering ? "At least 8 characters" : "Enter your password"}
              required
              minLength={registering ? 8 : undefined}
              autoComplete={registering ? "new-password" : "current-password"}
            />
            {fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}
          </div>

          {registered && (
            <p className="field-success" role="status">
              Account created. Check your email to confirm it, then sign in.
            </p>
          )}
          {authError && <p className="field-error" role="alert">{authError}</p>}

          <SubmitButton className="btn-primary btn-block" pendingText={registering ? "Creating account…" : "Signing in…"}>
            {registering ? "Create customer account" : "Sign in"}
          </SubmitButton>
        </form>

        {googleEnabled && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "1.25rem 0 0.85rem" }}>
              <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
              <span style={{ fontSize: "0.76rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                or
              </span>
              <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
            </div>
            <GoogleSignInButton next={next} />
          </>
        )}

        <p className="auth-subtitle" style={{ marginTop: "1.1rem" }}>
          {registering ? "Already have an account?" : "New to Addis Eats?"}{" "}
          <Link href={registering ? withNext("/signin") : withNext("/signin?mode=register")}>
            {registering ? "Sign in" : "Create a customer account"}
          </Link>
        </p>
        {!registering && (
          <p className="auth-subtitle" style={{ marginTop: "0.4rem", fontSize: "0.8rem" }}>
            Kitchen and delivery staff: your manager creates your account. Ask them if you need a password reset.
          </p>
        )}
      </div>
    </div>
  );
}
