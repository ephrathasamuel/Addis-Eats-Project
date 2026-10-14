import Link from "next/link";
import { signIn } from "@/app/actions";

export default async function SignInPage({ searchParams }) {
  const params = await searchParams;
  const next = params?.next || "/orders";
  const isKitchen = Boolean(next && next.includes("/kitchen"));
  const isAdmin = Boolean(next && next.includes("/admin")) || params?.admin === "true";
  const isDelivery = Boolean(next && next.includes("/delivery"));

  const defaultName = isAdmin
    ? "System Admin"
    : isDelivery
    ? "Abebe Courier"
    : isKitchen
    ? "Chef Kassahun"
    : "Almaz";

  const defaultEmail = isAdmin
    ? "admin@addiseats.com"
    : isDelivery
    ? "delivery@addiseats.com"
    : isKitchen
    ? "staff@addiseats.com"
    : "almaz@example.com";

  const name = params?.name !== undefined ? params.name : defaultName;
  const email = params?.email !== undefined ? params.email : defaultEmail;

  let fieldErrors = {};
  try {
    fieldErrors = params?.error ? JSON.parse(params.error) : {};
  } catch {
    fieldErrors = {};
  }

  const selectedRole = email.toLowerCase().includes("admin")
    ? "admin"
    : email.toLowerCase().includes("delivery")
    ? "delivery"
    : email.toLowerCase().includes("staff") || email.toLowerCase().includes("chef")
    ? "staff"
    : "customer";

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: "440px" }}>
        <h1>Sign in</h1>
        <p className="auth-subtitle">
          {next && next !== "/"
            ? `Sign in to access ${next}`
            : "Sign in to your Addis Eats account"}
        </p>

        {/* Quick Role Switcher Chips (Day 45 feature with all roles) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.45rem", marginBottom: "1.25rem" }}>
          <Link
            href={`/signin?next=${encodeURIComponent(next.includes("/admin") ? next : "/admin")}&name=System+Admin&email=admin%40addiseats.com`}
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
            href={`/signin?next=${encodeURIComponent(next.includes("/kitchen") ? next : "/kitchen")}&name=Chef+Kassahun&email=staff%40addiseats.com`}
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
            href={`/signin?next=${encodeURIComponent(next.includes("/delivery") ? next : "/delivery")}&name=Abebe+Courier&email=delivery%40addiseats.com`}
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
            href={`/signin?next=${encodeURIComponent(next.includes("/orders") ? next : "/orders")}&name=Almaz&email=almaz%40example.com`}
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

        <form action={signIn} key={`${name}-${email}`}>
          <input type="hidden" name="next" value={next} />

          <div className="field">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              name="name"
              defaultValue={name}
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
              defaultValue={email}
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
              defaultValue="password123"
              placeholder="Password"
              required
              autoComplete="current-password"
            />
            {fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}
          </div>

          <button type="submit" className="btn-primary btn-block">
            {selectedRole === "admin"
              ? "Sign in to Admin Panel"
              : selectedRole === "staff"
              ? "Sign in to Kitchen Portal"
              : selectedRole === "delivery"
              ? "Sign in to Courier Portal"
              : "Sign in to Addis Eats"}
          </button>
        </form>

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
          <strong>Demo Role Guide:</strong>
          <ul style={{ margin: "0.35rem 0 0", paddingLeft: "1.2rem", lineHeight: "1.5" }}>
            <li><strong>Admin Panel:</strong> <code>admin@addiseats.com</code> (Inventory, Finances, Orders)</li>
            <li><strong>Kitchen Staff:</strong> <code>staff@addiseats.com</code> (Kitchen preparation queue)</li>
            <li><strong>Delivery Courier:</strong> <code>delivery@addiseats.com</code> (Pickups and deliveries)</li>
            <li><strong>Customer:</strong> <code>almaz@example.com</code> (Personal orders &amp; favorites)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
