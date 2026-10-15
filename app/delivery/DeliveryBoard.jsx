"use client";

import { useEffect, useRef, useState } from "react";
import {
  claimAndStartDeliveryAction,
  completeDeliveryAction,
} from "@/app/actions";
import { getDishByIdSync, getDishByNameSync } from "@/lib/dishes";
import Link from "next/link";

export function DeliveryBoard({ initialOrders, user }) {
  const [orders, setOrders] = useState(initialOrders);
  const [loadingId, setLoadingId] = useState(null);
  const [notification, setNotification] = useState("");
  const [sharingLocation, setSharingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");
  const lastLocationSentAt = useRef(0);

  const isAdmin = user?.role === "admin";
  const courierId = user?.id;

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 4000);
  };

  const handleGrabOrder = async (orderId) => {
    setLoadingId(orderId);
    const res = await claimAndStartDeliveryAction(orderId);
    setLoadingId(null);
    if (res?.ok) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                ...res.order,
                status: "on-the-way",
                courierId: user?.id,
                courierName: user?.name,
                deliveryStartedAt: new Date().toISOString(),
              }
            : o
        )
      );
      showToast(`Order #${orderId} claimed! Added to your active delivery transit.`);
    } else {
      alert(res?.error || "Failed to grab order. It may have been claimed by another courier.");
    }
  };

  const handleCompleteDelivery = async (orderId) => {
    setLoadingId(orderId);
    const res = await completeDeliveryAction(orderId);
    setLoadingId(null);
    if (res?.ok) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: "delivered",
                deliveredAt: new Date().toISOString(),
              }
            : o
        )
      );
      showToast(`Order #${orderId} marked as delivered to customer doorstep!`);
    } else {
      alert(res?.error || "Failed to mark order as delivered.");
    }
  };

  // Open Pickup Pool: Served by kitchen and not yet claimed by any courier
  const openPickupPool = orders.filter((o) => o.status === "served" && !o.courierId);

  // In Transit:
  // Couriers see ONLY their own claimed deliveries. Admin sees all active in-transit orders.
  const inTransit = orders.filter((o) =>
    o.status === "on-the-way" &&
    (isAdmin || o.courierId === courierId)
  );

  // Completed Deliveries:
  // Couriers see ONLY their own completed deliveries. Admin sees all completed deliveries.
  const deliveredList = orders.filter((o) =>
    o.status === "delivered" &&
    (isAdmin || o.courierId === courierId)
  );

  // Earnings: Couriers see ONLY their own earnings. Admin sees total collected across all couriers.
  const myEarnings = deliveredList.reduce(
    (sum, o) => sum + (o.deliveryFee || 50),
    0
  );
  const activeOrderIds = inTransit.map((order) => order.id).join(",");

  useEffect(() => {
    if (!sharingLocation || !activeOrderIds) return undefined;
    if (!navigator.geolocation) {
      setLocationError("This browser does not support courier location sharing.");
      setSharingLocation(false);
      return undefined;
    }

    const orderIds = activeOrderIds.split(",");
    const watchId = navigator.geolocation.watchPosition(
      async ({ coords }) => {
        const now = Date.now();
        if (now - lastLocationSentAt.current < 10000) return;
        lastLocationSentAt.current = now;
        setLocationError("");
        try {
          const updates = await Promise.all(
            orderIds.map(async (orderId) => {
              const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/location`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  latitude: coords.latitude,
                  longitude: coords.longitude,
                }),
              });
              const result = await response.json();
              return response.ok
                ? { ok: true }
                : { ok: false, error: result.error || "Location update failed." };
            })
          );
          const failedUpdate = updates.find((result) => !result.ok);
          if (failedUpdate) setLocationError(failedUpdate.error);
        } catch {
          setLocationError("Unable to update delivery location. Please try again.");
        }
      },
      (error) => {
        setLocationError(error.message || "Unable to read courier location.");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [sharingLocation, activeOrderIds]);

  return (
    <div>
      {/* Courier Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.75rem",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              marginBottom: "0.25rem",
            }}
          >
            <h1 style={{ margin: 0, fontSize: "1.85rem" }}>
              Delivery Courier Portal
            </h1>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: "750",
                textTransform: "uppercase",
                padding: "0.2rem 0.65rem",
                borderRadius: "999px",
                backgroundColor: isAdmin ? "var(--brand)" : "#2563eb",
                color: "white",
              }}
            >
              {isAdmin ? "Admin Monitoring" : "Courier Dispatch"}
            </span>
          </div>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.95rem" }}>
            {isAdmin
              ? "Live tracking of all courier dispatches, pickup pools, transit timing, and customer receipts"
              : "Grab kitchen orders, deliver to customer doorsteps, and collect neighborhood delivery fees"}
          </p>
        </div>

        {isAdmin && (
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <Link
              href="/kitchen"
              className="btn-secondary"
              style={{ fontSize: "0.88rem", padding: "0.5rem 1rem" }}
            >
              Kitchen Queue
            </Link>
            <Link
              href="/admin"
              className="btn-ghost"
              style={{ fontSize: "0.88rem", padding: "0.5rem 1rem" }}
            >
              Admin Panel
            </Link>
          </div>
        )}
      </div>

      {notification && (
        <div
          style={{
            padding: "0.75rem 1.25rem",
            background: "rgba(34, 197, 94, 0.15)",
            border: "1px solid #16a34a",
            borderRadius: "12px",
            color: "#16a34a",
            fontWeight: "600",
            fontSize: "0.9rem",
            marginBottom: "1.5rem",
          }}
        >
          {notification}
        </div>
      )}

      {!isAdmin && inTransit.length > 0 && (
        <section style={{ marginBottom: "1.5rem", padding: "1rem", borderRadius: "12px", border: "1px solid var(--border)", background: "var(--card-bg)" }}>
          <p style={{ margin: "0 0 0.75rem", color: "var(--muted)", lineHeight: 1.5 }}>
            Share your device location while this page is open so customers can see your courier position. Location sharing is optional and stops when you turn it off or leave this page.
          </p>
          <button
            type="button"
            className={sharingLocation ? "btn-secondary" : "btn-primary"}
            onClick={() => {
              setLocationError("");
              setSharingLocation((enabled) => !enabled);
            }}
          >
            {sharingLocation ? "Stop sharing location" : "Share live courier location"}
          </button>
          {locationError && <p role="alert" className="field-error" style={{ marginBottom: 0 }}>{locationError}</p>}
        </section>
      )}

      {/* Courier KPI Metrics */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--border)",
            borderRadius: "16px",
            padding: "1.1rem",
          }}
        >
          <span
            style={{
              fontSize: "0.8rem",
              color: "var(--muted)",
              textTransform: "uppercase",
              fontWeight: "600",
            }}
          >
            Available for Pickup
          </span>
          <div
            style={{
              fontSize: "1.6rem",
              fontWeight: "800",
              color: "#e67e22",
              marginTop: "0.25rem",
            }}
          >
            {openPickupPool.length} Open Orders
          </div>
        </div>

        <div
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--border)",
            borderRadius: "16px",
            padding: "1.1rem",
          }}
        >
          <span
            style={{
              fontSize: "0.8rem",
              color: "var(--muted)",
              textTransform: "uppercase",
              fontWeight: "600",
            }}
          >
            {isAdmin ? "All Couriers In Transit" : "My Active Deliveries"}
          </span>
          <div
            style={{
              fontSize: "1.6rem",
              fontWeight: "800",
              color: "#2563eb",
              marginTop: "0.25rem",
            }}
          >
            {inTransit.length} Driving
          </div>
        </div>

        <div
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--border)",
            borderRadius: "16px",
            padding: "1.1rem",
          }}
        >
          <span
            style={{
              fontSize: "0.8rem",
              color: "var(--muted)",
              textTransform: "uppercase",
              fontWeight: "600",
            }}
          >
            {isAdmin ? "Total Completed" : "My Completed Deliveries"}
          </span>
          <div
            style={{
              fontSize: "1.6rem",
              fontWeight: "800",
              color: "#16a34a",
              marginTop: "0.25rem",
            }}
          >
            {deliveredList.length} Delivered
          </div>
        </div>

        <div
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--border)",
            borderRadius: "16px",
            padding: "1.1rem",
          }}
        >
          <span
            style={{
              fontSize: "0.8rem",
              color: "var(--muted)",
              textTransform: "uppercase",
              fontWeight: "600",
            }}
          >
            {isAdmin ? "Total Delivery Fees" : "My Delivery Earnings"}
          </span>
          <div
            style={{
              fontSize: "1.6rem",
              fontWeight: "800",
              color: "var(--brand-dark)",
              marginTop: "0.25rem",
            }}
          >
            {myEarnings.toLocaleString()} ETB
          </div>
        </div>
      </div>

      {/* Section 1: Open Pickup Pool (Available for any courier to grab) */}
      <section style={{ marginBottom: "2.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.25rem", margin: 0 }}>
            Open Pickup Pool : Ready at Kitchen ({openPickupPool.length})
          </h2>
          <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
            Available to all couriers : First to grab starts delivery
          </span>
        </div>

        {openPickupPool.length === 0 ? (
          <div
            className="empty-state"
            style={{
              padding: "2rem 1rem",
              background: "var(--card-bg)",
              borderRadius: "16px",
              border: "1px solid var(--border)",
            }}
          >
            <p style={{ margin: 0, color: "var(--muted)" }}>
              No dishes currently waiting on the kitchen dispatch counter.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {openPickupPool.map((order) => {
              const foodCost = order.foodTotal || (order.total - (order.deliveryFee || 50));
              const deliveryCost = order.deliveryFee || 50;

              return (
                <div
                  key={order.id}
                  style={{
                    background: "var(--card-bg)",
                    border: "1.5px solid #e67e22",
                    borderRadius: "20px",
                    padding: "1.25rem",
                    boxShadow: "0 2px 10px var(--shadow-color)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <strong style={{ fontSize: "1.1rem" }}>Order #{order.id}</strong>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: "750",
                          textTransform: "uppercase",
                          padding: "0.2rem 0.6rem",
                          borderRadius: "999px",
                          background: "rgba(230, 126, 34, 0.15)",
                          color: "#e67e22",
                        }}
                      >
                        Ready for Grab
                      </span>
                    </div>

                    <div style={{ marginBottom: "0.6rem" }}>
                      {isAdmin ? (
                        <>
                          <div style={{ fontSize: "1.05rem", fontWeight: "700" }}>{order.name}</div>
                          {order.phone && (
                            <div style={{ fontSize: "0.9rem", color: "var(--muted)", marginTop: "0.15rem" }}>
                              Phone:{" "}
                              <a href={`tel:${order.phone}`} style={{ fontWeight: "650", color: "var(--brand)" }}>
                                {order.phone}
                              </a>
                            </div>
                          )}
                        </>
                      ) : (
                        <span style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
                          Customer contact details are available after you claim this order.
                        </span>
                      )}
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

                    <div
                      style={{
                        padding: "0.65rem 0.85rem",
                        background: "var(--brand-light)",
                        borderRadius: "12px",
                        marginBottom: "0.85rem",
                        fontSize: "0.88rem",
                      }}
                    >
                      <div>
                        Destination: <strong>{order.location}</strong>
                      </div>
                      <div style={{ marginTop: "0.25rem", fontSize: "0.82rem", color: "var(--muted)" }}>
                        Neighborhood estimate: <strong>{order.estimatedEta || "Unavailable"}</strong> (not traffic-aware)
                      </div>
                      <div
                        style={{
                          marginTop: "0.35rem",
                          paddingTop: "0.35rem",
                          borderTop: "1px solid var(--border)",
                          fontSize: "0.83rem",
                          color: "var(--text)",
                        }}
                      >
                        Food: <strong>{foodCost} ETB</strong> | Your Delivery Fee:{" "}
                        <strong style={{ color: "#16a34a" }}>+{deliveryCost} ETB</strong> | Total:{" "}
                        <strong style={{ color: "var(--brand-dark)" }}>{order.total} ETB</strong>
                      </div>
                    </div>

                    <div className="profile-cart-list" style={{ marginBottom: "0.85rem" }}>
                      {order.items?.map((item, idx) => {
                        const dish = getDishByIdSync(item.id) || getDishByNameSync(item.name);
                        const imgSrc = item.image || dish?.image || "/images/food/doro-wat.jpg";
                        return (
                          <div className="order-item-card" key={idx} style={{ padding: "0.35rem 0.5rem" }}>
                            <div className="order-item-media">
                              <div className="order-item-frame" style={{ width: "40px", height: "40px" }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={imgSrc} alt={item.name} className="order-item-thumb" />
                              </div>
                              <span className="order-item-name" style={{ fontSize: "0.88rem" }}>
                                {item.name}
                              </span>
                            </div>
                            <div className="num-pill num-pill--qty">
                              <span className="num-pill__val">{item.qty}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div
                    style={{
                      borderTop: "1px solid var(--border)",
                      paddingTop: "0.85rem",
                      marginTop: "0.5rem",
                    }}
                  >
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
                        Admin Monitoring: Awaiting courier claim
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleGrabOrder(order.id)}
                        disabled={loadingId === order.id}
                        className="btn-primary"
                        style={{
                          width: "100%",
                          padding: "0.6rem 1rem",
                          fontSize: "0.95rem",
                          backgroundColor: "#e67e22",
                          borderColor: "#e67e22",
                        }}
                      >
                        {loadingId === order.id ? "Claiming..." : "Grab Order & Start Delivery"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Section 2: In Transit Deliveries */}
      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>
          {isAdmin ? "All Active Deliveries In Transit" : "My Active Deliveries"} ({inTransit.length})
        </h2>

        {inTransit.length === 0 ? (
          <div
            className="empty-state"
            style={{
              padding: "2rem 1rem",
              background: "var(--card-bg)",
              borderRadius: "16px",
              border: "1px solid var(--border)",
            }}
          >
            <p style={{ margin: 0, color: "var(--muted)" }}>
              {isAdmin
                ? "No couriers currently driving en route."
                : "You have no active deliveries in progress. Grab an order from the pickup pool above!"}
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {inTransit.map((order) => {
              const foodCost = order.foodTotal || (order.total - (order.deliveryFee || 50));
              const deliveryCost = order.deliveryFee || 50;

              return (
                <div
                  key={order.id}
                  style={{
                    background: "var(--card-bg)",
                    border: "1.5px solid #2563eb",
                    borderRadius: "20px",
                    padding: "1.25rem",
                    boxShadow: "0 2px 10px var(--shadow-color)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <strong style={{ fontSize: "1.1rem" }}>Order #{order.id}</strong>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: "750",
                          textTransform: "uppercase",
                          padding: "0.2rem 0.6rem",
                          borderRadius: "999px",
                          background: "rgba(37, 99, 235, 0.15)",
                          color: "#2563eb",
                        }}
                      >
                        In Transit
                      </span>
                    </div>

                    <div style={{ marginBottom: "0.6rem" }}>
                      {order.courierId === courierId || isAdmin ? (
                        <>
                          <div style={{ fontSize: "1.05rem", fontWeight: "700" }}>{order.name}</div>
                          {order.phone && (
                            <div style={{ fontSize: "0.9rem", color: "var(--muted)", marginTop: "0.15rem" }}>
                              Phone:{" "}
                              <a href={`tel:${order.phone}`} style={{ fontWeight: "650", color: "var(--brand)" }}>
                                {order.phone}
                              </a>
                            </div>
                          )}
                        </>
                      ) : null}
                      {isAdmin && order.courierName && (
                        <div style={{ fontSize: "0.85rem", color: "#2563eb", marginTop: "0.2rem", fontWeight: "600" }}>
                          Courier: {order.courierName}
                        </div>
                      )}
                      {!isAdmin && (
                        <Link
                          href={`/track/${encodeURIComponent(String(order.id))}`}
                          className="btn-secondary"
                          style={{ display: "inline-flex", marginBottom: "0.75rem" }}
                        >
                          Open delivery map
                        </Link>
                      )}
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

                    <div
                      style={{
                        padding: "0.65rem 0.85rem",
                        background: "rgba(37, 99, 235, 0.08)",
                        borderRadius: "12px",
                        marginBottom: "0.85rem",
                        fontSize: "0.88rem",
                      }}
                    >
                      <div>
                        Destination: <strong>{order.location}</strong>
                      </div>
                      <div style={{ marginTop: "0.25rem", fontSize: "0.82rem", color: "var(--muted)" }}>
                        Neighborhood estimate: <strong>{order.estimatedEta || "Unavailable"}</strong> (not traffic-aware)
                      </div>
                      <div
                        style={{
                          marginTop: "0.35rem",
                          paddingTop: "0.35rem",
                          borderTop: "1px solid var(--border)",
                          fontSize: "0.83rem",
                          color: "var(--text)",
                        }}
                      >
                        Food: <strong>{foodCost} ETB</strong> | Delivery: <strong>{deliveryCost} ETB</strong> | Total:{" "}
                        <strong style={{ color: "#2563eb" }}>{order.total} ETB</strong>
                      </div>
                    </div>

                    <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "0.5rem" }}>
                      Items: {order.items?.map((i) => `${i.name} (${i.qty})`).join(", ")}
                    </div>
                  </div>

                  <div
                    style={{
                      borderTop: "1px solid var(--border)",
                      paddingTop: "0.85rem",
                      marginTop: "0.5rem",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <Link
                        href={`/track/${order.id}`}
                        className="btn-ghost"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.45rem",
                          fontSize: "0.88rem",
                          fontWeight: "700",
                          color: "#2563eb",
                          borderColor: "#2563eb",
                          background: "rgba(37, 99, 235, 0.08)",
                          padding: "0.5rem 1rem",
                          textDecoration: "none",
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
                          <line x1="9" y1="3" x2="9" y2="18" />
                          <line x1="15" y1="6" x2="15" y2="21" />
                        </svg>
                        <span>Open Live Route Map</span>
                      </Link>

                      {isAdmin ? (
                        <div
                          style={{
                            textAlign: "center",
                            padding: "0.45rem",
                            background: "rgba(37, 99, 235, 0.08)",
                            borderRadius: "10px",
                            fontSize: "0.84rem",
                            color: "#2563eb",
                            fontWeight: "600",
                          }}
                        >
                          Admin Monitoring: Courier driving to destination
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleCompleteDelivery(order.id)}
                          disabled={loadingId === order.id}
                          className="btn-primary"
                          style={{
                            width: "100%",
                            padding: "0.65rem 1rem",
                            fontSize: "0.95rem",
                            backgroundColor: "#16a34a",
                            borderColor: "#16a34a",
                          }}
                        >
                          {loadingId === order.id ? "Completing..." : "Mark Delivered to Customer"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Section 3: Completed Deliveries with Customer Receipt Status */}
      <section>
        <h2
          style={{
            fontSize: "1.15rem",
            marginBottom: "0.75rem",
            color: "var(--muted)",
          }}
        >
          {isAdmin ? "Completed Delivery History" : "My Completed Deliveries"} ({deliveredList.length})
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "1rem",
          }}
        >
          {deliveredList.slice(0, 10).map((order) => {
            const deliveryCost = order.deliveryFee || 50;

            return (
              <div
                key={order.id}
                style={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "16px",
                  padding: "1rem",
                  opacity: 0.95,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontWeight: 650 }}>
                    Order #{order.id} : {order.name}
                  </span>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: "750",
                      padding: "0.15rem 0.5rem",
                      borderRadius: "999px",
                      background: "rgba(34, 197, 94, 0.15)",
                      color: "#16a34a",
                    }}
                  >
                    Delivered
                  </span>
                </div>

                <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: "0.3rem" }}>
                  Destination: <strong>{order.location}</strong>
                  {isAdmin && order.courierName && <span> | Courier: <strong>{order.courierName}</strong></span>}
                </div>

                <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: "0.2rem" }}>
                  Delivery Fee Earned: <strong style={{ color: "#16a34a" }}>+{deliveryCost} ETB</strong> | Total:{" "}
                  <strong style={{ color: "var(--brand-dark)" }}>{order.total} ETB</strong>
                </div>

                {/* Display whether customer confirmed receipt */}
                <div
                  style={{
                    marginTop: "0.5rem",
                    paddingTop: "0.5rem",
                    borderTop: "1px solid var(--border)",
                    fontSize: "0.82rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "0.4rem",
                  }}
                >
                  <span style={{ color: "var(--muted)" }}>Customer Receipt:</span>
                  {order.confirmedByCustomer ? (
                    <span style={{ color: "#16a34a", fontWeight: "700" }}>
                      Confirmed {order.receivedAt ? `(${new Date(order.receivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})` : ""}
                    </span>
                  ) : (
                    <span style={{ color: "#d97706", fontWeight: "600" }}>
                      Awaiting Customer Confirmation
                    </span>
                  )}
                </div>

                <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "0.3rem" }}>
                  Courier transit time: <strong>{order.deliveryDurationMinutes || 18} mins</strong>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
