"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { claimAndStartDeliveryAction, completeDeliveryAction } from "@/app/actions";
import { Toast } from "@/components/Modal";
import { useNow, minutesAgo } from "@/hooks/useNow";

// Courier dispatch board. Every courier sees the same live pool of orders the
// kitchen has finished; the first to tap "Accept" gets it (like a ride-hailing
// request). Accepted orders move to "My deliveries" with the customer details.
export function DeliveryBoard({ initialOrders, user }) {
  const isAdmin = user.role === "admin";
  const { data, mutate } = useSWR("/api/delivery", fetcher, {
    fallbackData: { orders: initialOrders },
    refreshInterval: 4000,
    revalidateOnFocus: true,
    keepPreviousData: true,
  });
  const orders = (data || { orders: initialOrders }).orders;
  const now = useNow(20000);

  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");
  const lastLocationSentAt = useRef(0);

  const pool = orders.filter((o) => o.status === "served" && !o.courierId);
  const active = orders.filter((o) => o.status === "on-the-way" && (isAdmin || o.courierId === user.id));
  const delivered = orders.filter((o) => o.status === "delivered" && (isAdmin || o.courierId === user.id));
  const startOfDay = new Date(now).setHours(0, 0, 0, 0);
  const deliveredToday = delivered.filter((o) => new Date(o.deliveredAt).getTime() >= startOfDay);
  const earningsToday = deliveredToday.reduce((sum, o) => sum + (Number(o.deliveryFee) || 0), 0);

  // Optimistically move the card, then trust the server's list.
  async function runAction(orderId, optimistic, action, successMessage) {
    setBusyId(orderId);
    mutate(
      // The cache can still be empty before the first refresh; start from what's on screen.
      (current = { orders }) => ({ orders: current.orders.map((o) => (o.id === orderId ? { ...o, ...optimistic } : o)) }),
      { revalidate: false }
    );
    try {
      const result = await action(orderId);
      if (result?.orders) mutate({ orders: result.orders }, { revalidate: false });
      else mutate();
      setToast(result?.ok ? { tone: "success", message: successMessage } : { tone: "error", message: result?.error || "Something went wrong." });
    } catch {
      mutate();
      setToast({ tone: "error", message: "Network problem. Please try again." });
    } finally {
      setBusyId(null);
    }
  }

  const accept = (orderId) =>
    runAction(
      orderId,
      { status: "on-the-way", courierId: user.id, courierName: user.name, deliveryStartedAt: new Date().toISOString() },
      claimAndStartDeliveryAction,
      `Order #${orderId} is yours. Customer details are below.`
    );

  const complete = (orderId) => {
    if (!confirm(`Confirm order #${orderId} was handed to the customer?`)) return;
    runAction(orderId, { status: "delivered", deliveredAt: new Date().toISOString() }, completeDeliveryAction, `Order #${orderId} delivered. Nice work!`);
  };

  const activeOrderIds = active.filter((o) => o.courierId === user.id).map((o) => o.id).join(",");

  useEffect(() => {
    if (!sharingLocation || !activeOrderIds) return undefined;
    if (!navigator.geolocation) {
      setLocationError("This browser does not support location sharing.");
      setSharingLocation(false);
      return undefined;
    }
    const orderIds = activeOrderIds.split(",");
    const watchId = navigator.geolocation.watchPosition(
      async ({ coords }) => {
        const nowMs = Date.now();
        if (nowMs - lastLocationSentAt.current < 10000) return;
        lastLocationSentAt.current = nowMs;
        setLocationError("");
        try {
          const updates = await Promise.all(
            orderIds.map(async (orderId) => {
              const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/location`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ latitude: coords.latitude, longitude: coords.longitude }),
              });
              const result = await response.json().catch(() => ({}));
              return response.ok ? { ok: true } : { ok: false, error: result.error || "Location update failed." };
            })
          );
          const failed = updates.find((u) => !u.ok);
          if (failed) setLocationError(failed.error);
        } catch {
          setLocationError("Unable to update your location. Please try again.");
        }
      },
      (error) => setLocationError(error.message || "Unable to read your location."),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [sharingLocation, activeOrderIds]);

  return (
    <div className="board">
      <div className="stat-row">
        <Stat label="Waiting for a courier" value={pool.length} tone="orange" />
        <Stat label={isAdmin ? "Out for delivery" : "My active deliveries"} value={active.length} tone="blue" />
        <Stat label={isAdmin ? "Delivered today" : "My deliveries today"} value={deliveredToday.length} tone="green" />
        <Stat label={isAdmin ? "Delivery fees today" : "My earnings today"} value={`${earningsToday.toLocaleString()} ETB`} />
      </div>

      {!isAdmin && activeOrderIds && (
        <section className="share-location">
          <div>
            <strong>Live location</strong>
            <p>Let your customers follow you on the map while this page is open.</p>
          </div>
          <button
            type="button"
            className={sharingLocation ? "btn-secondary" : "btn-primary"}
            onClick={() => {
              setLocationError("");
              setSharingLocation((on) => !on);
            }}
          >
            {sharingLocation ? "Stop sharing" : "Share my location"}
          </button>
          {locationError && <p role="alert" className="field-error" style={{ margin: 0, flexBasis: "100%" }}>{locationError}</p>}
        </section>
      )}

      <div className="delivery-layout">
        <section className="board-column" aria-labelledby="pool-heading">
          <header className="board-column__header">
            <h2 id="pool-heading">Available orders <span className="count">{pool.length}</span></h2>
            <span className="board-column__note">First courier to accept gets it</span>
          </header>
          {pool.length === 0 && <p className="board-empty">No orders waiting. New pickups appear here automatically.</p>}
          {pool.map((order) => (
            <article key={order.id} className="ticket ticket--pool">
              <div className="ticket__header">
                <strong className="ticket__id">#{order.id}</strong>
                <span className="ticket__age" suppressHydrationWarning>
                  Ready {minutesAgo(order.kitchenServedAt || order.createdAt, now)}
                </span>
                <span className="ticket__label ticket__label--earn">+{order.deliveryFee} ETB</span>
              </div>
              <div className="pool-destination">
                <span className="pool-destination__area">{order.location}</span>
                <span className="pool-destination__eta">~{order.estimatedEta || "?"} drive</span>
                {order.hasMapPin && <span className="chip">Map pin</span>}
              </div>
              <p className="ticket__meta">
                {order.items.reduce((sum, i) => sum + i.qty, 0)} items · collect {order.total} ETB
              </p>
              {isAdmin ? (
                <p className="ticket__meta">Waiting for a courier to accept.</p>
              ) : (
                <div className="ticket__actions">
                  <button type="button" className="btn-primary btn-accept" disabled={busyId === order.id} onClick={() => accept(order.id)}>
                    {busyId === order.id ? "Accepting…" : "Accept delivery"}
                  </button>
                </div>
              )}
            </article>
          ))}
        </section>

        <section className="board-column" aria-labelledby="active-heading">
          <header className="board-column__header">
            <h2 id="active-heading">{isAdmin ? "Out for delivery" : "My deliveries"} <span className="count">{active.length}</span></h2>
          </header>
          {active.length === 0 && (
            <p className="board-empty">{isAdmin ? "No couriers on the road." : "Accept an order to start a delivery."}</p>
          )}
          {active.map((order) => (
            <ActiveDelivery
              key={order.id}
              order={order}
              now={now}
              isAdmin={isAdmin}
              busy={busyId === order.id}
              onComplete={() => complete(order.id)}
            />
          ))}

          <h3 className="board-subheading">Completed today ({deliveredToday.length})</h3>
          {deliveredToday.length === 0 && <p className="board-empty">No completed deliveries yet today.</p>}
          <ul className="completed-list">
            {deliveredToday.slice(0, 15).map((order) => (
              <li key={order.id}>
                <span>
                  #{order.id} · {order.location}
                  {isAdmin && order.courierName ? ` · ${order.courierName}` : ""}
                </span>
                <span className={order.confirmedByCustomer ? "text-green" : "text-muted"}>
                  {order.confirmedByCustomer ? "Customer confirmed" : "Awaiting confirmation"} · +{order.deliveryFee} ETB
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <Toast message={toast?.message} tone={toast?.tone} onDone={() => setToast(null)} />
    </div>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className={`stat stat--${tone || "brand"}`}>
      <span className="stat__label">{label}</span>
      <span className="stat__value">{value}</span>
    </div>
  );
}

function ActiveDelivery({ order, now, isAdmin, busy, onComplete }) {
  const pin = order.deliveryCoordinates;
  const directions = pin
    ? `https://www.google.com/maps/dir/?api=1&destination=${pin.latitude},${pin.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${order.location}, Addis Ababa`)}`;

  return (
    <article className="ticket ticket--active">
      <div className="ticket__header">
        <strong className="ticket__id">#{order.id}</strong>
        <span className="ticket__age" suppressHydrationWarning>
          Picked up {minutesAgo(order.deliveryStartedAt || order.createdAt, now)}
        </span>
        <span className="ticket__label">On the way</span>
      </div>
      <div className="customer-block">
        <div>
          <strong>{order.name}</strong>
          {order.phone && (
            <a href={`tel:${order.phone}`} className="customer-block__phone">
              {order.phone}
            </a>
          )}
        </div>
        <div className="customer-block__address">
          <span>{order.location}</span>
          {order.addressDetails && <span className="text-muted">{order.addressDetails}</span>}
          {!pin && <span className="text-muted">No map pin shared. Call the customer if you need directions.</span>}
        </div>
        {isAdmin && order.courierName && <p className="ticket__meta">Courier: {order.courierName}</p>}
        {order.adminEdited && (
          <p className="ticket__note">Updated by {order.adminEditedBy || "admin"}: {order.adminEditNote}</p>
        )}
      </div>
      <p className="ticket__meta">{order.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</p>
      <p className="ticket__meta">
        Collect <strong>{order.total} ETB</strong> · your fee <strong className="text-green">+{order.deliveryFee} ETB</strong>
      </p>
      <div className="ticket__actions">
        <a href={directions} target="_blank" rel="noreferrer" className="btn-secondary">
          Directions
        </a>
        <Link href={`/track/${order.id}`} className="btn-secondary">
          Live map
        </Link>
        {!isAdmin && (
          <button type="button" className="btn-success" disabled={busy} onClick={onComplete}>
            {busy ? "Saving…" : "Mark delivered"}
          </button>
        )}
      </div>
    </article>
  );
}
