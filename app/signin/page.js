import { signIn, signUp } from "@/app/actions";
import Link from "next/link";
import PasswordInput from "@/components/PasswordInput";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function SignInPage({ searchParams }) {
  const params = await searchParams;
  const next = params?.next || "/orders";
  const registering = params?.mode === "register";

  // Determine role: prioritize explicit role query param, or destination-based role
  const explicitRole = params?.role;
  const destinationRole = next.includes("/admin")
    ? "admin"
    : next.includes("/kitchen")
    ? "staff"
    : next.includes("/delivery")
    ? "delivery"
    : "customer";

  const selectedRole = ["admin", "staff", "delivery", "customer"].includes(explicitRole)
    ? explicitRole
    : destinationRole;

  let fieldErrors = {};
  try {
    if (params?.error) fieldErrors = JSON.parse(params.error);
  } catch {
    fieldErrors = {};
  }
  const authError = params?.error && Object.keys(fieldErrors).length === 0
    ? params.error
    : null;
  const registered = params?.registered === "1";

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: "440px" }}>
        <h1>{registering ? "Create account" : "Sign in"}</h1>
        <p className="auth-subtitle">
          {registering
            ? "Create a customer account to place and track orders."
            : next && next !== "/" && next !== "/orders"
            ? `Sign in to access ${next}`
            : "Sign in to your Addis Eats account"}
        </p>

        {/* Role Selector Chips: allows logging into any role with ANY email */}
        {!registering && (
          <div style={{ marginBottom: "1.25rem" }}>
            <div style={{ fontSize: "0.78rem", fontWeight: "650", color: "var(--muted)", marginBottom: "0.4rem" }}>
              Select Sign In Portal:
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.45rem" }}>
              <Link
                href={`/signin?role=admin&next=${encodeURIComponent(next.includes("/admin") ? next : "/admin")}`}
                className="btn-secondary"
                style={{
                  padding: "0.5rem",
                  textAlign: "center",
                  fontSize: "0.8rem",
                  textDecoration: "none",
                  borderRadius: "10px",
                  backgroundColor: selectedRole === "admin" ? "var(--brand)" : "transparent",
                  color: selectedRole === "admin" ? "#fff" : "var(--text)",
                  border: "1px solid var(--border)",
                  fontWeight: selectedRole === "admin" ? "750" : "500",
                }}
              >
                Admin Panel
              </Link>
              <Link
                href={`/signin?role=staff&next=${encodeURIComponent(next.includes("/kitchen") ? next : "/kitchen")}`}
                className="btn-secondary"
                style={{
                  padding: "0.5rem",
                  textAlign: "center",
                  fontSize: "0.8rem",
                  textDecoration: "none",
                  borderRadius: "10px",
                  backgroundColor: selectedRole === "staff" ? "var(--brand)" : "transparent",
                  color: selectedRole === "staff" ? "#fff" : "var(--text)",
                  border: "1px solid var(--border)",
                  fontWeight: selectedRole === "staff" ? "750" : "500",
                }}
              >
                Kitchen Staff
              </Link>
              <Link
                href={`/signin?role=delivery&next=${encodeURIComponent(next.includes("/delivery") ? next : "/delivery")}`}
                className="btn-secondary"
                style={{
                  padding: "0.5rem",
                  textAlign: "center",
                  fontSize: "0.8rem",
                  textDecoration: "none",
                  borderRadius: "10px",
                  backgroundColor: selectedRole === "delivery" ? "var(--brand)" : "transparent",
                  color: selectedRole === "delivery" ? "#fff" : "var(--text)",
                  border: "1px solid var(--border)",
                  fontWeight: selectedRole === "delivery" ? "750" : "500",
                }}
              >
                Delivery Courier
              </Link>
              <Link
                href={`/signin?role=customer&next=${encodeURIComponent(next.includes("/orders") ? next : "/orders")}`}
                className="btn-secondary"
                style={{
                  padding: "0.5rem",
                  textAlign: "center",
                  fontSize: "0.8rem",
                  textDecoration: "none",
                  borderRadius: "10px",
                  backgroundColor: selectedRole === "customer" ? "var(--brand)" : "transparent",
                  color: selectedRole === "customer" ? "#fff" : "var(--text)",
                  border: "1px solid var(--border)",
                  fontWeight: selectedRole === "customer" ? "750" : "500",
                }}
              >
                Customer Portal
              </Link>
            </div>
          </div>
        )}

        <form action={registering ? signUp : signIn} key={`${selectedRole}-${registering}`}>
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="role" value={selectedRole} />

          {registering && (
            <div className="field">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                name="name"
                defaultValue={params?.name || ""}
                placeholder="Enter your name"
                required
                autoComplete="name"
              />
              {fieldErrors.name && <p className="field-error">{fieldErrors.name}</p>}
            </div>
          )}

          <div className="field">
            <label htmlFor="email">
              {registering
                ? "Email"
                : selectedRole === "admin"
                ? "Admin Email (any email address)"
                : selectedRole === "staff"
                ? "Kitchen Staff Email (any email address)"
                : selectedRole === "delivery"
                ? "Courier Email (any email address)"
                : "Email"}
            </label>
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
              placeholder="Enter your password"
              required
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

          <button type="submit" className="btn-primary btn-block">
            {registering
              ? "Create customer account"
              : selectedRole === "admin"
              ? "Sign in as Restaurant Admin"
              : selectedRole === "staff"
              ? "Sign in as Kitchen Staff"
              : selectedRole === "delivery"
              ? "Sign in as Delivery Courier"
              : "Sign in to Addis Eats"}
          </button>
        </form>

        {/* Google Authentication Option */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "1.25rem 0 0.85rem" }}>
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
          <span style={{ fontSize: "0.76rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            or continue with
          </span>
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
        </div>

        <GoogleSignInButton next={next} role={selectedRole} isSupabaseConfigured={isSupabaseConfigured()} />

        <p className="auth-subtitle" style={{ marginTop: "1.1rem" }}>
          {registering ? "Already have an account?" : "New to Addis Eats?"}{" "}
          <Link href={registering ? `/signin?next=${encodeURIComponent(next)}` : `/signin?mode=register&next=${encodeURIComponent(next)}`}>
            {registering ? "Sign in" : "Create a customer account"}
          </Link>
        </p>
      </div>
    </div>
  );
}
