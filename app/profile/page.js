import Link from "next/link";
import { getSession } from "@/lib/session";
import { getOrdersFor } from "@/lib/orders";
import { signOut } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getSession();

  if (!user) {
    return (
      <div className="empty-state">
        <h1>Profile</h1>
        <p>Sign in to see your account and order history.</p>
        <Link href="/signin?next=/profile" className="btn-primary">
          Sign in
        </Link>
      </div>
    );
  }

  // --- ADMIN PROFILE ---
  if (user.role === "admin") {
    return (
      <div className="profile-page" style={{ maxWidth: "800px", margin: "2rem auto", padding: "0 1.5rem" }}>
        <div className="profile-header">
          <div>
            <h1 style={{ margin: 0 }}>{user.name}</h1>
            <p className="empty" style={{ margin: "0.25rem 0 0", color: "var(--muted)" }}>{user.email}</p>
          </div>

          <form action={signOut}>
            <button type="submit" className="btn-ghost">
              Sign out
            </button>
          </form>
        </div>

        <section
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--border)",
            borderRadius: "20px",
            padding: "1.75rem",
            boxShadow: "0 2px 8px var(--shadow-color)",
            marginTop: "1.5rem",
          }}
        >
          <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.25rem" }}>Restaurant Administration</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.92rem", marginBottom: "1.5rem" }}>
            Full system control: menu inventory, dish availability, adding new dishes, and review analytics.
          </p>

          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <Link
              href="/admin"
              className="btn-primary"
              style={{ padding: "0.75rem 1.25rem", fontSize: "0.95rem" }}
            >
              Open Admin Control Panel
            </Link>
            <Link
              href="/kitchen"
              className="btn-secondary"
              style={{ padding: "0.75rem 1.25rem", fontSize: "0.95rem" }}
            >
              Open Kitchen Queue
            </Link>
            <Link
              href="/delivery"
              className="btn-secondary"
              style={{ padding: "0.75rem 1.25rem", fontSize: "0.95rem" }}
            >
              Open Delivery Queue
            </Link>
            <Link
              href="/admin/staff"
              className="btn-secondary"
              style={{ padding: "0.75rem 1.25rem", fontSize: "0.95rem" }}
            >
              Manage Staff Accounts
            </Link>
          </div>
        </section>
      </div>
    );
  }

  // --- STAFF (KITCHEN) PROFILE ---
  if (user.role === "staff") {
    return (
      <div className="profile-page" style={{ maxWidth: "800px", margin: "2rem auto", padding: "0 1.5rem" }}>
        <div className="profile-header">
          <div>
            <h1 style={{ margin: 0 }}>{user.name}</h1>
            <p className="empty" style={{ margin: "0.25rem 0 0", color: "var(--muted)" }}>{user.email}</p>
          </div>

          <form action={signOut}>
            <button type="submit" className="btn-ghost">
              Sign out
            </button>
          </form>
        </div>

        <section
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--border)",
            borderRadius: "20px",
            padding: "1.75rem",
            boxShadow: "0 2px 8px var(--shadow-color)",
            marginTop: "1.5rem",
          }}
        >
          <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.25rem" }}>Kitchen Operations Portal</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.92rem", marginBottom: "1.5rem" }}>
            Monitor and advance food preparation statuses from &quot;Start Cooking&quot; to courier handoff.
          </p>

          <div>
            <Link
              href="/kitchen"
              className="btn-primary"
              style={{ padding: "0.75rem 1.25rem", fontSize: "0.95rem" }}
            >
              Open Kitchen Queue
            </Link>
          </div>
        </section>
      </div>
    );
  }

  // --- DELIVERY COURIER PROFILE ---
  if (user.role === "delivery") {
    return (
      <div className="profile-page" style={{ maxWidth: "800px", margin: "2rem auto", padding: "0 1.5rem" }}>
        <div className="profile-header">
          <div>
            <h1 style={{ margin: 0 }}>{user.name}</h1>
            <p className="empty" style={{ margin: "0.25rem 0 0", color: "var(--muted)" }}>{user.email}</p>
          </div>

          <form action={signOut}>
            <button type="submit" className="btn-ghost">
              Sign out
            </button>
          </form>
        </div>

        <section
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--border)",
            borderRadius: "20px",
            padding: "1.75rem",
            boxShadow: "0 2px 8px var(--shadow-color)",
            marginTop: "1.5rem",
          }}
        >
          <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.25rem" }}>Delivery Operations Portal</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.92rem", marginBottom: "1.5rem" }}>
            View available pickups and manage only the deliveries assigned to your courier account.
          </p>
          <Link
            href="/delivery"
            className="btn-primary"
            style={{ padding: "0.75rem 1.25rem", fontSize: "0.95rem" }}
          >
            Open Delivery Queue
          </Link>
        </section>
      </div>
    );
  }

  // --- CUSTOMER PROFILE: Clean, simplified, without name/email subtitles or role tags ---
  const allOrders = getOrdersFor(user.id);
  const recentOrders = allOrders.slice(0, 10); // Capped at last 10 orders

  return (
    <div className="profile-page" style={{ maxWidth: "820px", margin: "2rem auto", padding: "0 1.5rem" }}>
      <div className="profile-header" style={{ marginBottom: "1.75rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.75rem" }}>{user.name || "Your Profile"}</h1>
          {user.email && <p className="empty" style={{ margin: "0.25rem 0 0", color: "var(--muted)" }}>{user.email}</p>}
        </div>

        <form action={signOut}>
          <button type="submit" className="btn-ghost">
            Sign out
          </button>
        </form>
      </div>

      <section className="profile-section">
        <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>Your Order History</h2>
        {recentOrders.length === 0 ? (
          <div className="empty-state">
            <p className="empty">
              No orders placed yet. Explore our delicious menu to make your first order!
            </p>
            <Link href="/menu" className="btn-primary" style={{ marginTop: "1rem", display: "inline-block" }}>
              Explore Menu
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {recentOrders.map((order) => {
              const itemsSummary = order.items
                ?.map((i) => `${i.name} (${i.qty})`)
                .join(" · ");

              return (
                <div
                  key={order.id}
                  style={{
                    background: "var(--card-bg)",
                    border: "1px solid var(--border)",
                    borderRadius: "16px",
                    padding: "1.25rem",
                    boxShadow: "0 2px 6px var(--shadow-color)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "1rem",
                  }}
                >
                  <div style={{ flex: 1, minWidth: "240px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.35rem" }}>
                      <strong style={{ fontSize: "1.05rem" }}>Order #{order.id}</strong>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: "750",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          padding: "0.15rem 0.55rem",
                          borderRadius: "999px",
                          backgroundColor:
                            order.status === "delivered"
                              ? "rgba(34, 197, 94, 0.15)"
                              : order.status === "cancelled"
                              ? "rgba(239, 68, 68, 0.15)"
                              : "var(--brand-light)",
                          color:
                            order.status === "delivered"
                              ? "#16a34a"
                              : order.status === "cancelled"
                              ? "#dc2626"
                              : "var(--brand-dark)",
                        }}
                      >
                        {order.status}
                      </span>
                    </div>

                    <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "0.35rem" }}>
                      {new Date(order.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>

                    <div style={{ fontSize: "0.9rem", color: "var(--text)", fontWeight: "500" }}>
                      {itemsSummary || "Dishes in order"}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--muted)", display: "block" }}>Total Paid</span>
                      <strong style={{ fontSize: "1.15rem", color: "var(--brand-dark)" }}>
                        {order.total} ETB
                      </strong>
                    </div>

                    <Link
                      href={`/orders/${order.id}`}
                      className="btn-ghost"
                      style={{ fontSize: "0.85rem", padding: "0.45rem 0.85rem" }}
                    >
                      Track Order
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
