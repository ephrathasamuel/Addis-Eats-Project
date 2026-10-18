import { redirect } from "next/navigation";
import Link from "next/link";
import { staffSignIn } from "@/app/actions";
import PasswordInput from "@/components/PasswordInput";
import SubmitButton from "@/components/SubmitButton";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Staff sign in",
  robots: { index: false },
};

const ROLE_HOME = { admin: "/admin", staff: "/kitchen", delivery: "/delivery", customer: "/menu" };

// Separate from the customer sign-in: only admin, kitchen and delivery
// accounts (created by the admin) can sign in here. No sign-up, no Google.
export default async function StaffSignInPage({ searchParams }) {
  const params = await searchParams;
  const next = typeof params?.next === "string" ? params.next : "";

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
  const emailQuery = params?.email ? `?email=${encodeURIComponent(params.email)}` : "";

  return (
    <div className="auth-page">
      <div className="auth-card auth-card--staff" style={{ maxWidth: "440px" }}>
        <div className="staff-badge-row" aria-label="Restaurant staff only">
          <span className="staff-badge staff-badge--admin">Admin</span>
          <span className="staff-badge staff-badge--staff">Kitchen</span>
          <span className="staff-badge staff-badge--delivery">Delivery</span>
        </div>
        <h1>Staff sign in</h1>
        <p className="auth-subtitle">
          For restaurant staff only. Your account is created by the restaurant admin.
        </p>

        <form action={staffSignIn}>
          <input type="hidden" name="next" value={next} />
          <div className="field">
            <label htmlFor="email">Work email</label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={params?.email || ""}
              placeholder="name@addiseats.com"
              required
              autoComplete="username"
            />
            {fieldErrors.email && <p className="field-error">{fieldErrors.email}</p>}
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <PasswordInput id="password" placeholder="Enter your password" required autoComplete="current-password" />
            {fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}
          </div>

          {authError && (
            <div className="auth-notice" role="alert">
              <p>{authError}</p>
              {params?.hint === "customer" && (
                <Link href={`/signin${emailQuery}`} className="btn-primary btn-block">
                  Go to customer sign-in
                </Link>
              )}
            </div>
          )}

          <SubmitButton className="btn-primary btn-block" pendingText="Signing in…">
            Sign in to the staff area
          </SubmitButton>
        </form>

        <p className="auth-subtitle" style={{ marginTop: "1.1rem" }}>
          Forgot your password? Ask the restaurant admin to reset it.
        </p>
        <p className="auth-subtitle auth-staff-link">
          Ordering food? <Link href="/signin">Customer sign-in</Link>
        </p>
      </div>
    </div>
  );
}
