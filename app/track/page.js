import { getOrders, getAllOrders } from "@/lib/orders";
import { getSession } from "@/lib/session";
import { cookies } from "next/headers";
import Link from "next/link";
import DeliveryMap from "./[id]/DeliveryMap";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Live Delivery Map : Addis Ababa Courier Tracking",
  description: "Real-time OpenStreetMap tracking of Addis Eats food deliveries across Addis Ababa neighborhoods.",
};

export default async function TrackIndexPage({ searchParams }) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const user = await getSession();

  let orders = [];
  if (user?.role === "admin" || user?.role === "staff" || user?.role === "delivery") {
    orders = getAllOrders().filter((o) => o.status !== "delivered" && o.status !== "cancelled");
    if (orders.length === 0) orders = getAllOrders().slice(0, 5);
  } else if (user) {
    orders = getOrders(user.id);
  }

  if (orders.length === 0) {
    const raw = cookieStore.get("recent_orders")?.value;
    if (raw) {
      try {
        orders = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
      } catch {}
    }
  }

  const allSystemOrders = getAllOrders();
  const selectedOrderId = params?.order || orders[0]?.id || allSystemOrders[0]?.id || "1001";
  const selectedOrder =
    orders.find((o) => String(o.id) === String(selectedOrderId)) ||
    allSystemOrders.find((o) => String(o.id) === String(selectedOrderId)) || {
      id: "1001",
      name: "Almaz Bekele",
      status: "on-the-way",
      location: "Bole",
      total: 350,
      createdAt: new Date().toISOString(),
      items: [{ name: "Doro Wat", qty: 1, price: 350 }],
    };

  return (
    <main style={{ maxWidth: "1080px", margin: "2rem auto", padding: "0 1.5rem 4rem" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ margin: "0 0 0.35rem" }}>Live Delivery &amp; Courier Map</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Real-time OpenStreetMap tracking across Addis Ababa neighborhoods (Bole, Kazanchis, Piassa, Sarbet, CMC).
        </p>
      </div>

      {allSystemOrders.length > 1 && (
        <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", marginBottom: "1.25rem", paddingBottom: "0.5rem" }}>
          {allSystemOrders.slice(0, 6).map((o) => (
            <Link
              key={o.id}
              href={`/track?order=${o.id}`}
              className="btn-ghost"
              style={{
                fontSize: "0.85rem",
                whiteSpace: "nowrap",
                backgroundColor: String(o.id) === String(selectedOrderId) ? "var(--brand)" : "transparent",
                color: String(o.id) === String(selectedOrderId) ? "#fff" : "var(--text)",
                borderColor: String(o.id) === String(selectedOrderId) ? "var(--brand)" : "var(--border)",
              }}
            >
              Order #{o.id} ({o.status})
            </Link>
          ))}
        </div>
      )}

      <DeliveryMap orderId={selectedOrder.id} initialOrder={selectedOrder} />
    </main>
  );
}
