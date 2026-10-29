import Link from "next/link";
import { getSession } from "@/lib/session";
import { getOrdersFor, getStaffStats, startOfToday } from "@/lib/orders";
import { signOut } from "@/app/actions";
import { Avatar } from "@/components/Modal";
import { ChangePasswordForm, ChangePinForm, StaffProfileForm } from "./ProfileSettings";
import { DeleteAccount } from "./DeleteAccount";
import { PushToggle } from "@/components/PushToggle";

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
            <Link href="/admin/team" className="btn-secondary">Team performance</Link>
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
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link href={user.role === "staff" ? "/kitchen" : "/delivery"} className="btn-primary">
              Open the {user.role === "staff" ? "kitchen" : "delivery"} board
            </Link>
            <Link href={user.role === "staff" ? "/kitchen/history" : "/delivery/history"} className="btn-secondary">
              My history
            </Link>
          </div>
        </section>
      )}

      {isStaff && <StaffProfileForm user={{ name: user.name, phone: user.phone, photo: user.photo, role: user.role }} />}
      {user.role === "staff" && <ChangePinForm />}
      <details className="card-panel collapsible-panel notifications-panel">
        <summary>Notifications</summary>
        <PushToggle
          purpose={
            user.role === "staff"
              ? "Get a notification for every new order, even when the kitchen board is closed."
              : user.role === "delivery"
              ? "Get a notification as soon as an order is ready for pickup."
              : user.role === "admin"
              ? "Get a notification when a customer reports a problem."
              : "Get a notification when your food is being cooked, picked up, on the way and delivered."
          }
        />
      </details>
      <ChangePasswordForm hasPassword={hasPassword} canEmailReset={user.provider === "supabase"} />

      {user.role === "customer" && <CustomerOrders userId={user.id} />}
      {user.role === "customer" && <DeleteAccount email={user.email} />}
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
              <div key={order.id} className="card-panel profile-order-card">
                <div>
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
                  {/* One dish per line */}
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, fontSize: "0.9rem", fontWeight: "500", lineHeight: 1.6 }}>
                    {order.items?.length
                      ? order.items.map((i, index) => <li key={`${i.id}-${index}`}>{i.name} ({i.qty})</li>)
                      : <li>Dishes in order</li>}
                  </ul>
                </div>
                {/* Total on the left, the button in the bottom-right corner */}
                <div className="profile-order-card__footer">
                  <span className="profile-order-card__total">
                    <span>Total</span> <strong>{order.total} ETB</strong>
                  </span>
                  <Link href={`/orders/${order.id}?from=profile`} className="btn-ghost" style={{ fontSize: "0.85rem", padding: "0.45rem 0.85rem" }}>
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
