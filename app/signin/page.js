import { signIn, signUp } from "@/app/actions";
import Link from "next/link";
import PasswordInput from "@/components/PasswordInput";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function SignInPage({ searchParams }) {
  const params = await searchParams;
  const next = params?.next || "/orders";
  const registering = params?.mode === "register";
  const supabaseConnected = isSupabaseConfigured();

  const isKitchen = Boolean(next && next.includes("/kitchen"));
  const isAdmin = Boolean(next && next.includes("/admin")) || params?.admin === "true";
  const isDelivery = Boolean(next && next.includes("/delivery"));

  const defaultEmail = isAdmin
    ? "admin@addiseats.com"
    : isDelivery
    ? "delivery@addiseats.com"
    : isKitchen
    ? "staff@addiseats.com"
    : "almaz@example.com";

  const email = params?.email !== undefined ? params.email : (!registering ? defaultEmail : "");
  const emailLower = email.toLowerCase();

  const selectedRole = emailLower.includes("admin")
    ? "admin"
    : emailLower.includes("delivery") || emailLower.includes("courier")
    ? "delivery"
    : emailLower.includes("staff") || emailLower.includes("chef")
    ? "staff"
    : "customer";

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

        {!supabaseConnected && !registering && (
          <div
            style={{
              padding: "0.55rem 0.75rem",
              marginBottom: "1rem",
              background: "rgba(234, 88, 12, 0.08)",
              border: "1px solid rgba(234, 88, 12, 0.25)",
              borderRadius: "10px",
              fontSize: "0.8rem",
              color: "var(--text)",
              lineHeight: 1.4,
            }}
          >
            <strong>Local Demo Active:</strong> Supabase is not connected yet. Click any role button below to sign in instantly.
          </div>
        )}

        {/* Quick Role Switcher Chips */}
        {!registering && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.45rem", marginBottom: "1.25rem" }}>
            <Link
              href={`/signin?next=${encodeURIComponent(next.includes("/admin") ? next : "/admin")}&email=admin%40addiseats.com`}
              className="btn-secondary"
              style={{
                padding: "0.45rem 0.5rem",
                textAlign: "center",
                fontSize: "0.78rem",
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
              href={`/signin?next=${encodeURIComponent(next.includes("/kitchen") ? next : "/kitchen")}&email=staff%40addiseats.com`}
              className="btn-secondary"
              style={{
                padding: "0.45rem 0.5rem",
                textAlign: "center",
                fontSize: "0.78rem",
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
              href={`/signin?next=${encodeURIComponent(next.includes("/delivery") ? next : "/delivery")}&email=delivery%40addiseats.com`}
              className="btn-secondary"
              style={{
                padding: "0.45rem 0.5rem",
                textAlign: "center",
                fontSize: "0.78rem",
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
              href={`/signin?next=${encodeURIComponent(next.includes("/orders") ? next : "/orders")}&email=almaz%40example.com`}
              className="btn-secondary"
              style={{
                padding: "0.45rem 0.5rem",
                textAlign: "center",
                fontSize: "0.78rem",
                textDecoration: "none",
                borderRadius: "10px",
                backgroundColor: selectedRole === "customer" ? "var(--brand)" : "transparent",
                color: selectedRole === "customer" ? "#fff" : "var(--text)",
                border: "1px solid var(--border)",
                fontWeight: selectedRole === "customer" ? "750" : "500",
              }}
            >
              Customer Demo
            </Link>
          </div>
        )}

        <form action={registering ? signUp : signIn} key={`${email}-${registering}`}>
          <input type="hidden" name="next" value={next} />

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
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={email}
              placeholder="Enter your email"
              required
              autoComplete="email"
            />
            {fieldErrors.email && <p className="field-error">{fieldErrors.email}</p>}
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <PasswordInput
              id="password"
              minLength={6}
              maxLength={256}
              defaultValue="password123"
              placeholder={registering ? "At least 6 characters" : "Enter your password"}
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
              ? "Sign in to Admin Panel"
              : selectedRole === "staff"
              ? "Sign in to Kitchen Portal"
              : selectedRole === "delivery"
              ? "Sign in to Courier Portal"
              : "Sign in to Addis Eats"}
          </button>
        </form>

        <p className="auth-subtitle" style={{ marginTop: "1rem" }}>
          {registering ? "Already have an account?" : "New to Addis Eats?"}{" "}
          <Link href={registering ? `/signin?next=${encodeURIComponent(next)}` : `/signin?mode=register&next=${encodeURIComponent(next)}`}>
            {registering ? "Sign in" : "Create a customer account"}
          </Link>
        </p>

        {!registering && (
          <div
            style={{
              marginTop: "1.25rem",
              padding: "0.75rem",
              background: "var(--brand-light)",
              borderRadius: "12px",
              fontSize: "0.8rem",
              color: "var(--text)",
            }}
          >
            <strong>Test Accounts Guide:</strong>
            <ul style={{ margin: "0.35rem 0 0", paddingLeft: "1.2rem", lineHeight: "1.5" }}>
              <li><strong>Admin Panel:</strong> <code>admin@addiseats.com</code> (Inventory, Finances, Orders)</li>
              <li><strong>Kitchen Staff:</strong> <code>staff@addiseats.com</code> (Preparation queue)</li>
              <li><strong>Delivery Courier:</strong> <code>delivery@addiseats.com</code> (Pickups and deliveries)</li>
              <li><strong>Customer:</strong> <code>almaz@example.com</code> (Personal orders &amp; tracking)</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
