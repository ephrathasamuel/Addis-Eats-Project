import Link from "next/link";
import { getSession } from "@/lib/session";
import { getOrdersFor, getStaffStats, startOfToday } from "@/lib/orders";
import { signOut } from "@/app/actions";
import { Avatar } from "@/components/Modal";
import { ChangePasswordForm, ChangePinForm, StaffProfileForm } from "./ProfileSettings";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Your profile",
  robots: { index: false },
};

const ROLE_LABELS = { admin: "Administrator", staff: "Kitchen staff", delivery: "Delivery courier", customer: "Customer" };
const STATUS_COLORS = {
  delivered: ["rgba(34, 197, 94, 0.15)", "#16a34a"],
  cancelled: ["rgba(239, 68, 68, 0.15)", "#dc2626"],
};

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

  const isStaff = user.role === "staff" || user.role === "delivery";
  const hasPassword = user.provider === "local" || Boolean(user.hasPassword);
  const today = isStaff ? getStaffStats(startOfToday()) : null;
  const todayCount = user.role === "staff"
    ? today.cooks[user.id]?.done || 0
    : user.role === "delivery"
      ? today.couriers[user.id]?.delivered || 0
      : 0;

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div className="profile-header">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {(isStaff || user.photo) && <Avatar name={user.name} photo={user.photo} size={64} />}
          <div>
            <h1 style={{ margin: 0 }}>{user.name}</h1>
            <p style={{ margin: "0.25rem 0 0", color: "var(--muted)" }}>
              {user.email}
              {user.role !== "customer" && <> · {ROLE_LABELS[user.role]}</>}
            </p>
          </div>
        </div>
        <form action={signOut}>
          <button type="submit" className="btn-ghost">
            Sign out
          </button>
        </form>
      </div>

      {user.role === "admin" && (
        <section className="card-panel">
          <h2>Restaurant administration</h2>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link href="/admin" className="btn-primary">Admin panel</Link>
            <Link href="/admin/staff" className="btn-secondary">Staff accounts</Link>
            <Link href="/kitchen" className="btn-secondary">Kitchen</Link>
            <Link href="/delivery" className="btn-secondary">Delivery</Link>
          </div>
        </section>
      )}

      {isStaff && (
        <section className="card-panel">
          <h2>{user.role === "staff" ? "Kitchen" : "Deliveries"}</h2>
          <p style={{ marginTop: 0 }}>
            {user.role === "staff" ? "Orders you finished today" : "Deliveries you completed today"}:{" "}
            <strong style={{ fontSize: "1.2rem" }}>{todayCount}</strong>
          </p>
          <Link href={user.role === "staff" ? "/kitchen" : "/delivery"} className="btn-primary">
            Open the {user.role === "staff" ? "kitchen" : "delivery"} board
          </Link>
        </section>
      )}

      {isStaff && <StaffProfileForm user={{ name: user.name, phone: user.phone, photo: user.photo, role: user.role }} />}
      {user.role === "staff" && <ChangePinForm />}
      <ChangePasswordForm hasPassword={hasPassword} canEmailReset={user.provider === "supabase"} />

      {user.role === "customer" && <CustomerOrders userId={user.id} />}
    </div>
  );
}

function CustomerOrders({ userId }) {
  const recentOrders = getOrdersFor(userId).slice(0, 10);

  return (
    <section className="profile-section">
      <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>Your order history</h2>
      {recentOrders.length === 0 ? (
        <div className="empty-state">
          <p className="empty">No orders placed yet. Explore our menu to make your first order!</p>
          <Link href="/menu" className="btn-primary" style={{ marginTop: "1rem", display: "inline-block" }}>
            Explore Menu
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {recentOrders.map((order) => {
            const [background, color] = STATUS_COLORS[order.status] || ["var(--brand-light)", "var(--brand-dark)"];
            return (
              <div
                key={order.id}
                className="card-panel"
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}
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
                        backgroundColor: background,
                        color,
                      }}
                    >
                      {order.status}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "0.35rem" }}>
                    {new Date(order.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                  </div>
                  <div style={{ fontSize: "0.9rem", fontWeight: "500" }}>
                    {order.items?.map((i) => `${i.name} (${i.qty})`).join(" · ") || "Dishes in order"}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--muted)", display: "block" }}>Total</span>
                    <strong style={{ fontSize: "1.15rem", color: "var(--brand-dark)" }}>{order.total} ETB</strong>
                  </div>
                  <Link href={`/orders/${order.id}`} className="btn-ghost" style={{ fontSize: "0.85rem", padding: "0.45rem 0.85rem" }}>
                    {["delivered", "cancelled"].includes(order.status) ? "View order" : "Track order"}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
