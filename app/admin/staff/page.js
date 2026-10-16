import Link from "next/link";
import { redirect } from "next/navigation";
import { createStaffAccountAction } from "@/app/actions";
import PasswordInput from "@/components/PasswordInput";
import { getSession } from "@/lib/session";
import { getManagedStaffAccounts } from "@/lib/auth-store";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES = {
  duplicate: "An account already uses that email address.",
  invalid: "Enter a name, valid email, and password of at least 12 characters.",
  role: "Choose either Kitchen Staff or Delivery Courier.",
};

export default async function StaffAccountsPage({ searchParams }) {
  const user = await getSession();
  if (!user || user.role !== "admin") {
    redirect("/signin?next=/admin/staff");
  }

  const params = await searchParams;
  const accounts = getManagedStaffAccounts();
  const errorMessage = Object.hasOwn(ERROR_MESSAGES, params?.error)
    ? ERROR_MESSAGES[params.error]
    : null;

  return (
    <main style={{ maxWidth: "1000px", margin: "2rem auto", padding: "0 1.5rem 4rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ margin: 0 }}>Staff accounts</h1>
          <p style={{ color: "var(--muted)", margin: "0.5rem 0 0" }}>
            Create individual kitchen and delivery logins. Passwords are stored as salted hashes.
          </p>
        </div>
        <Link href="/admin" className="btn-secondary">Back to Admin Panel</Link>
      </div>

      {params?.created && (
        <p className="field-error" role="status" style={{ color: "var(--success, #16803c)" }}>
          Staff account created successfully.
        </p>
      )}
      {errorMessage && (
        <p className="field-error" role="alert">{errorMessage}</p>
      )}

      <section className="profile-section" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ marginTop: 0 }}>Add a staff member</h2>
        <form action={createStaffAccountAction} style={{ maxWidth: "560px" }}>
          <div className="field">
            <label htmlFor="staff-name">Name</label>
            <input id="staff-name" name="name" minLength={2} maxLength={80} autoComplete="name" required />
          </div>
          <div className="field">
            <label htmlFor="staff-email">Email</label>
            <input id="staff-email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="field">
            <label htmlFor="staff-role">Role</label>
            <select id="staff-role" name="role" defaultValue="staff" required>
              <option value="staff">Kitchen Staff</option>
              <option value="delivery">Delivery Courier</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="staff-password">Temporary password</label>
            <PasswordInput
              id="staff-password"
              minLength={12}
              maxLength={256}
              placeholder="At least 12 characters"
              autoComplete="new-password"
            />
          </div>
          <button type="submit" className="btn-primary">Create account</button>
        </form>
      </section>

      <section className="profile-section">
        <h2 style={{ marginTop: 0 }}>Existing staff accounts</h2>
        {accounts.length === 0 ? (
          <p className="empty">No kitchen or delivery accounts have been configured yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th scope="col" style={{ textAlign: "left", padding: "0.75rem" }}>Name</th>
                  <th scope="col" style={{ textAlign: "left", padding: "0.75rem" }}>Email</th>
                  <th scope="col" style={{ textAlign: "left", padding: "0.75rem" }}>Role</th>
                  <th scope="col" style={{ textAlign: "left", padding: "0.75rem" }}>Provisioned by</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td style={{ padding: "0.75rem", borderTop: "1px solid var(--border)" }}>{account.name}</td>
                    <td style={{ padding: "0.75rem", borderTop: "1px solid var(--border)" }}>{account.email}</td>
                    <td style={{ padding: "0.75rem", borderTop: "1px solid var(--border)" }}>
                      {account.role === "staff" ? "Kitchen Staff" : "Delivery Courier"}
                    </td>
                    <td style={{ padding: "0.75rem", borderTop: "1px solid var(--border)" }}>{account.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
