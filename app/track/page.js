import { getOrdersFor, toOrderTrackingData } from "@/lib/orders";
import { getSession } from "@/lib/session";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import DeliveryMap from "./[id]/DeliveryMap";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Live Delivery Map : Addis Ababa Courier Tracking",
  description: "Real-time OpenStreetMap tracking of Addis Eats food deliveries across Addis Ababa neighborhoods.",
};

export default async function TrackIndexPage({ searchParams }) {
  const params = await searchParams;
  const user = await getSession();
  if (!user) redirect("/signin?next=/track");

  const orders = getOrdersFor(user.id);
  const requestedOrderId = Array.isArray(params?.order) ? params.order[0] : params?.order;
  if (requestedOrderId && !orders.some((order) => String(order.id) === String(requestedOrderId))) {
    notFound();
  }
  const selectedOrder = orders.find((order) => String(order.id) === String(requestedOrderId)) || orders[0];

  return (
    <main style={{ maxWidth: "1080px", margin: "2rem auto", padding: "0 1.5rem 4rem" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ margin: "0 0 0.35rem" }}>Your Live Delivery Maps</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          View live tracking for your orders only.
        </p>
      </div>

      {orders.length > 0 ? (
        <>
          {orders.length > 1 && (
        <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", marginBottom: "1.25rem", paddingBottom: "0.5rem" }}>
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/track?order=${o.id}`}
              className="btn-ghost"
              style={{
                fontSize: "0.85rem",
                whiteSpace: "nowrap",
                backgroundColor: String(o.id) === String(selectedOrder.id) ? "var(--brand)" : "transparent",
                color: String(o.id) === String(selectedOrder.id) ? "#fff" : "var(--text)",
                borderColor: String(o.id) === String(selectedOrder.id) ? "var(--brand)" : "var(--border)",
              }}
            >
              Order #{o.id} ({o.status})
            </Link>
          ))}
        </div>
          )}
          <DeliveryMap orderId={selectedOrder.id} initialOrder={toOrderTrackingData(selectedOrder)} />
        </>
      ) : (
        <div className="empty-state">
          <h2>No orders to track yet</h2>
          <p>Your order maps will appear here after you place an order while signed in.</p>
          <Link href="/menu" className="btn-primary">Browse the menu</Link>
        </div>
      )}
    </main>
  );
}
