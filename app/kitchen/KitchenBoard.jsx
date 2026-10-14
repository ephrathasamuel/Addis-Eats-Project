"use client";

import { useState } from "react";
import { updateKitchenStatus } from "@/app/actions";
import { getDishByIdSync, getDishByNameSync } from "@/lib/dishes";
import Link from "next/link";

export function KitchenBoard({ initialOrders, isAdmin = false }) {
  const [orders, setOrders] = useState(initialOrders);
  const [loadingId, setLoadingId] = useState(null);

  const handleStatusChange = async (orderId, newStatus) => {
    if (isAdmin) return;
    setLoadingId(orderId);
    const res = await updateKitchenStatus(orderId, newStatus);
    setLoadingId(null);
    if (res?.ok) {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    } else {
      alert(res?.error || "Failed to update order status.");
    }
  };

  // Kitchen only cooks: placed and preparing are active kitchen jobs
  const kitchenCooking = orders.filter((o) => o.status === "placed" || o.status === "preparing");
  const kitchenServed = orders.filter((o) => o.status === "served");
  const inDeliveryOrDone = orders.filter((o) => o.status === "on-the-way" || o.status === "delivered");

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ margin: 0 }}>Active Kitchen Orders ({kitchenCooking.length})</h2>
          <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
            {isAdmin
              ? "Monitoring Mode : View kitchen cooking progress and courier handover."
              : "Kitchen prepares dishes and marks as \"Served\". Couriers manage delivery."}
          </span>
        </div>
        <Link href="/delivery" className="btn-secondary" style={{ fontSize: "0.88rem", padding: "0.45rem 0.95rem" }}>
          View Courier Delivery Board →
        </Link>
      </div>

      {kitchenCooking.length === 0 ? (
        <div className="empty-state" style={{ margin: "2rem 0 3rem" }}>
          <h2>Kitchen queue clear</h2>
          <p>No dishes currently awaiting preparation in the kitchen.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1.5rem", marginBottom: "3rem" }}>
          {kitchenCooking.map((order) => (
            <div
              key={order.id}
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--border)",
                borderRadius: "20px",
                padding: "1.25rem",
                boxShadow: "0 2px 8px var(--shadow-color)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <strong style={{ fontSize: "1.1rem" }}>Order #{order.id}</strong>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: "750",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      padding: "0.25rem 0.65rem",
                      borderRadius: "999px",
                      background: order.status === "preparing" ? "rgba(245, 158, 11, 0.15)" : "var(--brand-light)",
                      color: order.status === "preparing" ? "#d97706" : "var(--brand-dark)",
                    }}
                  >
                    {order.status === "preparing" ? "Cooking" : "Placed"}
                  </span>
                </div>

                <div style={{ fontSize: "0.88rem", color: "var(--muted)", marginBottom: "0.4rem" }}>
                  Customer: <strong>{order.name}</strong> ({order.phone || "No phone"})
                </div>

                <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: "0.5rem" }}>
                  Placed at: {new Date(order.createdAt).toLocaleTimeString()} | Destination: {order.location || "Bole"}
                </div>

                {order.adminEdited && (
                  <div
                    style={{
                      background: "rgba(124, 92, 255, 0.12)",
                      border: "1px solid rgba(124, 92, 255, 0.3)",
                      borderRadius: "10px",
                      padding: "0.35rem 0.65rem",
                      fontSize: "0.82rem",
                      color: "var(--brand-dark)",
                      marginBottom: "0.65rem",
                    }}
                  >
                    Note: Admin updated details ({order.adminEditedBy || "Admin"}): {order.adminEditNote}
                  </div>
                )}

                <div className="profile-cart-list" style={{ margin: "0.75rem 0 1rem" }}>
                  {order.items?.map((item, idx) => {
                    const dish = getDishByIdSync(item.id) || getDishByNameSync(item.name);
                    const imgSrc = item.image || dish?.image || "/images/food/doro-wat.jpg";

                    return (
                      <div className="order-item-card" key={idx}>
                        <div className="order-item-media">
                          <div className="order-item-frame">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={imgSrc} alt={item.name} className="order-item-thumb" />
                          </div>
                          <span className="order-item-name">{item.name}</span>
                        </div>

                        <div className="order-item-tables">
                          <div className="num-pill num-pill--qty" role="cell">
                            <span className="num-pill__label">Qty</span>
                            <span className="num-pill__val">{item.qty}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.85rem", marginTop: "0.5rem" }}>
                {isAdmin ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "0.45rem",
                      background: "var(--brand-light)",
                      borderRadius: "10px",
                      fontSize: "0.84rem",
                      color: "var(--brand-dark)",
                      fontWeight: "600",
                    }}
                  >
                    Admin Monitoring: Cooking handled by kitchen staff
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    {order.status === "placed" && (
                      <button
                        onClick={() => handleStatusChange(order.id, "preparing")}
                        disabled={loadingId === order.id}
                        className="btn-primary"
                        style={{ fontSize: "0.88rem", padding: "0.55rem 1rem", flex: 1 }}
                      >
                        {loadingId === order.id ? "Updating..." : "Start Cooking"}
                      </button>
                    )}
                    {order.status === "preparing" && (
                      <button
                        onClick={() => handleStatusChange(order.id, "served")}
                        disabled={loadingId === order.id}
                        className="btn-primary"
                        style={{ fontSize: "0.88rem", padding: "0.55rem 1rem", flex: 1, backgroundColor: "#16a34a", borderColor: "#16a34a" }}
                      >
                        {loadingId === order.id ? "Updating..." : "Mark as Served & Ready for Courier"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Orders Served by Kitchen, Awaiting Courier Pickup */}
      {kitchenServed.length > 0 && (
        <div style={{ marginBottom: "2.5rem" }}>
          <h3 style={{ fontSize: "1.15rem", marginBottom: "0.75rem", color: "#16a34a" }}>
            Ready for Delivery Courier ({kitchenServed.length})
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
            {kitchenServed.map((order) => (
              <div
                key={order.id}
                style={{
                  background: "var(--card-bg)",
                  border: "1px solid #16a34a",
                  borderRadius: "16px",
                  padding: "1rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong>Order #{order.id} ({order.name})</strong>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: "750",
                      background: "rgba(34, 197, 94, 0.15)",
                      color: "#16a34a",
                      padding: "0.2rem 0.6rem",
                      borderRadius: "999px",
                      textTransform: "uppercase",
                    }}
                  >
                    Served / Ready
                  </span>
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: "0.3rem" }}>
                  Destination: <strong>{order.location}</strong> | Served at: {order.kitchenServedAt ? new Date(order.kitchenServedAt).toLocaleTimeString() : "Just now"}
                </div>
                <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: "0.2rem" }}>
                  Kitchen prep time: <strong>{order.kitchenDurationMinutes || 15} mins</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h3>In Transit & Completed ({inDeliveryOrDone.length})</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
        {inDeliveryOrDone.slice(0, 6).map((order) => (
          <div
            key={order.id}
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              padding: "1rem",
              opacity: 0.85,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 600 }}>Order #{order.id} ({order.name})</span>
              <span
                style={{
                  fontWeight: "700",
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  padding: "0.15rem 0.5rem",
                  borderRadius: "999px",
                  background: order.status === "delivered" ? "rgba(34, 197, 94, 0.15)" : "rgba(59, 130, 246, 0.15)",
                  color: order.status === "delivered" ? "#16a34a" : "#2563eb",
                }}
              >
                {order.status === "on-the-way" ? "In Transit" : "Delivered"}
              </span>
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: "0.35rem" }}>
              Destination: {order.location} | Total: {order.total} ETB
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
