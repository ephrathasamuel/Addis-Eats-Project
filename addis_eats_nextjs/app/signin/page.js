import Link from "next/link";
import { signIn } from "@/app/actions";

export default async function SignInPage({ searchParams }) {
  const params = await searchParams;
  const next = params?.next || "/orders";
  const isAdminOrKitchen = Boolean(
    params?.admin === "true" ||
    (next && (next.includes("/kitchen") || next.includes("/admin")))
  );

  let fieldErrors = {};
  try {
    fieldErrors = params?.error ? JSON.parse(params.error) : {};
  } catch {
    fieldErrors = {};
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>{isAdminOrKitchen ? "Staff & Admin Access" : "Sign in"}</h1>
        <p className="auth-subtitle">
          {isAdminOrKitchen
            ? "Sign in with staff or administrator credentials"
            : next && next !== "/"
            ? `Sign in to access ${next}`
            : "Sign in to your Addis Eats account"}
        </p>

        {/* Form left completely blank - no prefilled values */}
        <form action={signIn}>
          <input type="hidden" name="next" value={next} />

          <div className="field">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              name="name"
              defaultValue=""
              placeholder="Your name"
              required
              autoComplete="name"
            />
            {fieldErrors.name && <p className="field-error">{fieldErrors.name}</p>}
          </div>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue=""
              placeholder="name@example.com"
              required
              autoComplete="email"
            />
            {fieldErrors.email && <p className="field-error">{fieldErrors.email}</p>}
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              defaultValue=""
              placeholder="Password"
              required
              autoComplete="current-password"
            />
            {fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}
          </div>

          <button type="submit" className="btn-primary btn-block">
            {isAdminOrKitchen ? "Sign in to Portal" : "Sign in"}
          </button>
        </form>

        {/* Role guide shown strictly on the staff/admin portal link */}
        {isAdminOrKitchen ? (
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
            <strong>Portal Roles Reference:</strong>
            <ul style={{ margin: "0.35rem 0 0", paddingLeft: "1.2rem", lineHeight: 1.45 }}>
              <li><strong>Kitchen Staff:</strong> <code>staff@addiseats.com</code> (Access to <code>/kitchen</code>)</li>
              <li><strong>Delivery Courier:</strong> <code>delivery@addiseats.com</code> (Access to <code>/delivery</code>)</li>
              <li><strong>Restaurant Admin:</strong> <code>admin@addiseats.com</code> (Access to <code>/admin</code> and full management)</li>
            </ul>
            <div style={{ marginTop: "0.5rem", textAlign: "right" }}>
              <Link href="/signin" style={{ fontSize: "0.78rem", color: "var(--muted)", textDecoration: "underline" }}>
                Switch to Regular Customer Sign In
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: "1.25rem", textAlign: "center" }}>
            <Link
              href="/signin?admin=true&next=/admin"
              style={{
                fontSize: "0.8rem",
                color: "var(--muted)",
                textDecoration: "none",
              }}
            >
              Are you restaurant staff or courier? Access Staff &amp; Delivery Portal &gt;
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
