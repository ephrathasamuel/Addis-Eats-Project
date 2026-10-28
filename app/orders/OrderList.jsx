"use client";

import Link from "next/link";
import { cancelOrder } from "@/app/actions";
import { useState } from "react";


// Readable status names for the badge.
const STATUS_LABELS = {
  "awaiting-payment": "Awaiting payment",
  placed: "Placed",
  preparing: "Cooking",
  served: "Ready",
  "on-the-way": "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function OrderList({ orders }) {
  const [orderState, setOrderState] = useState(orders);
  const [cancellingId, setCancellingId] = useState(null);

  const handleCancel = async (id) => {
    if (!confirm(`Are you sure you want to submit a Cancel Request for Order #${id}?`)) return;
    setCancellingId(id);
    const res = await cancelOrder(id);
    setCancellingId(null);
    if (res?.ok) {
      setOrderState((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: "cancelled" } : o))
      );
    } else {
      alert(res?.error || "Failed to cancel order.");
    }
  };

  if (!orderState || orderState.length === 0) {
    return (
      <div className="empty-state">
        <h2>No orders found</h2>
        <p>You haven&apos;t placed any orders yet. Check out today&apos;s menu!</p>
        <Link href="/menu" className="btn-primary">
          Explore Menu
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {orderState.map((order) => {
        const orderAgeMinutes = (Date.now() - new Date(order.createdAt).getTime()) / 60000;
        const canCancel = order.status === "placed" && orderAgeMinutes <= 5;

        return (
          <div
            key={order.id}
            style={{
              background: "var(--card-bg)",
              borderRadius: "20px",
              padding: "1.5rem",
              border: "1px solid var(--border)",
              boxShadow: "0 2px 8px var(--shadow-color)",
            }}
          >
            <div className="order-card__head">
              <div>
                <h3 style={{ margin: 0, fontSize: "1.15rem" }}>Order #{order.id}</h3>
                <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                  {new Date(order.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <span
                className="order-card__status"
                style={{
                  fontSize: "0.8rem",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  padding: "0.25rem 0.75rem",
                  borderRadius: "999px",
                  backgroundColor:
                    order.status === "cancelled"
                      ? "rgba(239, 68, 68, 0.15)"
                      : order.status === "delivered"
                      ? "rgba(34, 197, 94, 0.15)"
                      : "var(--brand-light)",
                  color:
                    order.status === "cancelled"
                      ? "#dc2626"
                      : order.status === "delivered"
                      ? "#16a34a"
                      : "var(--brand-dark)",
                }}
              >
                {STATUS_LABELS[order.status] || order.status}
              </span>
            </div>

            {order.adminEdited && (
              <div
                style={{
                  background: "rgba(124, 92, 255, 0.1)",
                  border: "1px solid rgba(124, 92, 255, 0.3)",
                  borderRadius: "10px",
                  padding: "0.4rem 0.75rem",
                  fontSize: "0.82rem",
                  color: "var(--brand-dark)",
                  marginBottom: "0.85rem",
                }}
              >
                <strong>Management Notice:</strong> Order details updated by {order.adminEditedBy || "Admin"}: {order.adminEditNote}
              </div>
            )}

            <div className="profile-cart-list" style={{ margin: "1rem 0" }}>
              {order.items?.map((item, idx) => {
                const imgSrc = item.image || "/images/food/hero-feast.jpg";
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
                      <div className="num-pill" role="cell">
                        <span className="num-pill__label">Qty</span>
                        <span className="num-pill__val">{item.qty}</span>
                      </div>
                      <div className="num-pill num-pill--total" role="cell">
                        <span className="num-pill__label">Total</span>
                        <span className="num-pill__val">{item.price * item.qty} ETB</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="order-card__footer">
              <div className="order-card__total">
                <span>Total</span>
                <strong>{order.total} ETB</strong>
              </div>

              <div className="order-card__actions">
                <Link href={`/orders/${order.id}`} className="btn-ghost" style={{ fontSize: "0.85rem" }}>
                  Status
                </Link>
                {/* The map only matters until the food arrives. */}
                {!["delivered", "cancelled"].includes(order.status) && (
                  <Link
                    href={`/track/${order.id}`}
                    className="btn-ghost"
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--brand-dark)",
                      borderColor: "var(--brand)",
                      backgroundColor: "var(--brand-light)",
                    }}
                  >
                    Map Route
                  </Link>
                )}
                {canCancel && (
                  <button
                    onClick={() => handleCancel(order.id)}
                    disabled={cancellingId === order.id}
                    style={{
                      background: "transparent",
                      color: "var(--danger)",
                      border: "1px solid var(--danger)",
                      borderRadius: "980px",
                      padding: "0.35rem 0.9rem",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    {cancellingId === order.id ? "Submitting..." : "Cancel Request"}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
