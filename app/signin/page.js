import { signIn, signUp, signInWithGoogle } from "@/app/actions";
import Link from "next/link";
import PasswordInput from "@/components/PasswordInput";

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

        <form action={signInWithGoogle}>
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="role" value={selectedRole} />
          <button
            type="submit"
            className="btn-secondary btn-block"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.6rem",
              width: "100%",
              padding: "0.65rem 1rem",
              borderRadius: "12px",
              fontSize: "0.92rem",
              fontWeight: "600",
              backgroundColor: "var(--card-bg)",
              border: "1px solid var(--border)",
              cursor: "pointer",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        </form>

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
