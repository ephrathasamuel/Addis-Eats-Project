"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { etb, when, relative } from "@/lib/format";
import Link from "next/link";
import { Avatar } from "@/components/Modal";

// viewerRole decides the footer links: couriers go back to their board,
// customers to their orders; nobody on the courier side sees "Order again".
export default function DeliveryMap({ orderId, initialOrder, viewerRole = "customer", customerPhone = "" }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const courierMarkerRef = useRef(null);
  const courierIconRef = useRef(null);
  const leafletRef = useRef(null);

  const [order, setOrder] = useState(initialOrder);
  const [connected, setConnected] = useState(false);
  const initialCourierLocation = initialOrder.courierLocation;
  const [courierPos, setCourierPos] = useState(
    initialCourierLocation
      ? [initialCourierLocation.latitude, initialCourierLocation.longitude]
      : null
  );
  const initialMapData = useRef({
    courierPos,
    deliveryPos: initialOrder.deliveryCoordinates
      ? [initialOrder.deliveryCoordinates.latitude, initialOrder.deliveryCoordinates.longitude]
      : null,
    location: initialOrder.location,
  });
  const deliveryCoordinates = initialOrder.deliveryCoordinates;
  const deliveryPos = deliveryCoordinates
    ? [deliveryCoordinates.latitude, deliveryCoordinates.longitude]
    : null;

  // 1. Consume Server-Sent Events (SSE), reconnecting after network hiccups
  //    until the order is delivered or cancelled.
  useEffect(() => {
    let eventSource = null;
    let retryTimer = null;
    let finished = false;

    function connect() {
      eventSource = new EventSource(`/api/orders/${orderId}/stream`);
      eventSource.onopen = () => setConnected(true);
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          setOrder((prev) => ({ ...prev, ...payload }));
          if (
            payload.courierLocation &&
            Number.isFinite(payload.courierLocation.latitude) &&
            Number.isFinite(payload.courierLocation.longitude)
          ) {
            setCourierPos([payload.courierLocation.latitude, payload.courierLocation.longitude]);
          }
          if (payload.status === "delivered" || payload.status === "cancelled") {
            finished = true;
            eventSource.close();
            setConnected(false);
          }
        } catch (err) {
          console.error("SSE parse error", err);
        }
      };
      eventSource.onerror = () => {
        setConnected(false);
        eventSource.close();
        if (!finished) retryTimer = setTimeout(connect, 5000);
      };
    }

    connect();
    return () => {
      finished = true;
      clearTimeout(retryTimer);
      eventSource?.close();
    };
  }, [orderId]);

  // 2. Initialize Leaflet client-side
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    let L;
    import("leaflet").then((leafletModule) => {
      L = leafletModule.default || leafletModule;
      leafletRef.current = L;

      if (!mapInstanceRef.current && mapContainerRef.current) {
        const { courierPos: initialCourierPos, deliveryPos: initialDeliveryPos } = initialMapData.current;
        const initialCenter = initialCourierPos || initialDeliveryPos || [9.0117, 38.7792];
        const map = L.map(mapContainerRef.current).setView(initialCenter, 13);
        mapInstanceRef.current = map;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        const courierIcon = L.divIcon({
          className: "courier-marker",
          html: '<div style="background:#7c5cff;color:white;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px rgba(124,92,255,0.7);font-size:16px;"></div>',
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });

        const deliveryIcon = L.divIcon({
          className: "delivery-marker",
          html: '<div style="background:#22c55e;color:white;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px rgba(34,197,94,0.7);font-size:16px;"></div>',
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });

        courierIconRef.current = courierIcon;
        const bounds = [];
        if (initialCourierPos) {
          courierMarkerRef.current = L.marker(initialCourierPos, { icon: courierIcon })
            .addTo(map)
            .bindPopup("Courier GPS location");
          bounds.push(initialCourierPos);
        }
        if (initialDeliveryPos) {
          const destinationLabel = document.createElement("strong");
          destinationLabel.textContent = `Delivery destination: ${initialMapData.current.location || "Customer address"}`;
          L.marker(initialDeliveryPos, { icon: deliveryIcon })
            .addTo(map)
            .bindPopup(destinationLabel);
          bounds.push(initialDeliveryPos);
        }
        if (bounds.length > 1) map.fitBounds(L.latLngBounds(bounds), { padding: [50, 50] });
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Sync courier marker coordinates on live updates
  useEffect(() => {
    if (!courierPos || !mapInstanceRef.current || !leafletRef.current) return;
    if (courierMarkerRef.current) {
      courierMarkerRef.current.setLatLng(courierPos);
    } else {
      courierMarkerRef.current = leafletRef.current
        .marker(courierPos, { icon: courierIconRef.current })
        .addTo(mapInstanceRef.current)
        .bindPopup("Courier GPS location");
    }
  }, [courierPos]);

  return (
    <div>
      {/* Header and Connection status indicator */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ margin: 0 }}>Order Delivery Map #{order.id}</h1>
          <p style={{ margin: "0.25rem 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>
            Placed {relative(order.createdAt)} • {when.format(new Date(order.createdAt))}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span
            style={{
              display: "inline-block",
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: connected ? "#22c55e" : "var(--muted)",
              boxShadow: connected ? "0 0 8px #22c55e" : "none",
            }}
          />
          <span style={{ fontSize: "0.85rem", color: "var(--muted)", fontWeight: "500" }}>
            {connected ? "Live updates on" : order.status === "delivered" || order.status === "cancelled" ? "Order finished" : "Reconnecting…"}
          </span>
        </div>
      </div>

      {viewerRole === "customer" && order.courier && (
        <div className="courier-card">
          <Avatar name={order.courier.name} photo={order.courier.photo} size={56} />
          <div>
            <div className="courier-card__label">{order.status === "delivered" ? "Delivered by" : "Your courier"}</div>
            <div className="courier-card__name">{order.courier.name}</div>
            {order.courier.phone && order.status !== "delivered" && (
              <a href={`tel:${order.courier.phone}`} className="call-button" style={{ marginTop: "0.5rem" }}>
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" /></svg> Call your courier · {order.courier.phone}
              </a>
            )}
          </div>
        </div>
      )}

      <div className="track-grid">
        {/* Leaflet Map with Explicit Height */}
        <div
          style={{
            background: "var(--card-bg)",
            borderRadius: "20px",
            border: "1px solid var(--border)",
            overflow: "hidden",
            boxShadow: "0 2px 8px var(--shadow-color)",
          }}
        >
          <div
            ref={mapContainerRef}
            style={{ height: "min(70vh, 560px)", minHeight: "360px", width: "100%", background: "var(--brand-light)" }}
          />
        </div>

        {/* Accessible Text Alternative Beside the Map */}
        <div
          style={{
            background: "var(--card-bg)",
            borderRadius: "20px",
            padding: "1.5rem",
            border: "1px solid var(--border)",
            boxShadow: "0 2px 8px var(--shadow-color)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h3 style={{ marginTop: 0, marginBottom: "1rem" }}>Delivery Dispatch Details</h3>

            <div style={{ padding: "0.75rem 1rem", borderRadius: "12px", background: "var(--brand-light)", marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--muted)", textTransform: "uppercase" }}>Current Stage</div>
              <strong style={{ fontSize: "1.15rem", color: "var(--brand-dark)", textTransform: "uppercase" }}>
                {order.status}
              </strong>
            </div>

            <div style={{ fontSize: "0.95rem", lineHeight: 1.6 }}>
              <p style={{ margin: "0.4rem 0" }}>
                <strong>Customer:</strong> {order.name}
              </p>
              {viewerRole !== "customer" && customerPhone && (
                <a href={`tel:${customerPhone}`} className="call-button" style={{ margin: "0.4rem 0 0.6rem" }}>
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" /></svg> Call customer · {customerPhone}
                </a>
              )}
              <p style={{ margin: "0.4rem 0" }}>
                <strong>Destination:</strong> {order.location || "Addis Ababa"}, Addis Ababa
              </p>
              {order.addressDetails && (
                <p style={{ margin: "0.4rem 0" }}>
                  <strong>Directions:</strong> {order.addressDetails}
                </p>
              )}
              <p style={{ margin: "0.4rem 0" }}>
                <strong>Courier GPS:</strong>{" "}
                {courierPos
                  ? `${courierPos[0].toFixed(5)}° N, ${courierPos[1].toFixed(5)}° E`
                  : "Waiting for courier to share location"}
              </p>
              {order.courierLocation?.updatedAt && (
                <p style={{ margin: "0.4rem 0" }}>
                  <strong>Last location update:</strong>{" "}
                  {when.format(new Date(order.courierLocation.updatedAt))}
                </p>
              )}
              <p style={{ margin: "0.4rem 0" }}>
                <strong>Delivery pin:</strong>{" "}
                {deliveryPos
                  ? `${deliveryPos[0].toFixed(5)}° N, ${deliveryPos[1].toFixed(5)}° E`
                  : "Customer did not share a precise map pin"}
              </p>
              <p style={{ margin: "0.4rem 0" }}>
                <strong>Travel-time estimate:</strong>{" "}
                {order.estimatedEta || "Unavailable"}
                {order.estimatedEta ? " (neighborhood range; not traffic-aware)" : ""}
              </p>
              <p style={{ margin: "0.4rem 0" }}>
                <strong>Order Total:</strong> {etb.format(order.total)}
              </p>
            </div>

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem", marginTop: "1rem" }}>
              <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem" }}>Ordered Items</h4>
              {order.items?.map((item, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", color: "var(--muted)" }}>
                  <span>{item.name} ({item.qty})</span>
                  <span style={{ color: "var(--text)" }}>{etb.format(item.price * item.qty)}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {viewerRole === "delivery" ? (
              <Link href="/delivery" className="btn-ghost" style={{ fontSize: "0.85rem" }}>
                ← Back to delivery board
              </Link>
            ) : viewerRole === "admin" ? (
              <Link href="/delivery" className="btn-ghost" style={{ fontSize: "0.85rem" }}>
                ← Delivery overview
              </Link>
            ) : (
              <Link href={`/orders/${order.id}`} className="btn-ghost" style={{ fontSize: "0.85rem" }}>
                ← Order details
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
