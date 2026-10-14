"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { etb, when, relative } from "@/lib/format";
import Link from "next/link";

export default function DeliveryMap({ orderId, initialOrder }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const courierMarkerRef = useRef(null);

  const [order, setOrder] = useState(initialOrder);
  const [connected, setConnected] = useState(false);
  const [courierPos, setCourierPos] = useState([9.018, 38.77]);

  // Delivery target coordinate in Addis Ababa (Bole district)
  const deliveryPos = [9.0054, 38.7885];

  // 1. Consume Server-Sent Events (SSE) stream via EventSource
  useEffect(() => {
    const eventSource = new EventSource(`/api/orders/${orderId}/stream`);

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        setOrder((prev) => ({ ...prev, ...payload }));

        if (payload.courierLocation) {
          setCourierPos(payload.courierLocation);
        }

        // Close stream upon delivery or cancellation
        if (payload.status === "delivered" || payload.status === "cancelled") {
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
    };

    return () => {
      eventSource.close();
    };
  }, [orderId]);

  // 2. Initialize Leaflet client-side
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    let L;
    import("leaflet").then((leafletModule) => {
      L = leafletModule.default || leafletModule;

      if (!mapInstanceRef.current && mapContainerRef.current) {
        const map = L.map(mapContainerRef.current).setView([9.0117, 38.7792], 13);
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

        const courierMarker = L.marker(courierPos, { icon: courierIcon })
          .addTo(map)
          .bindPopup("<strong>Courier on delivery route</strong>");
        courierMarkerRef.current = courierMarker;

        L.marker(deliveryPos, { icon: deliveryIcon })
          .addTo(map)
          .bindPopup(`<strong>Delivery Destination</strong><br/>${order.name} (${order.neighbourhood || "Bole"})`);

        // Fit map view to both courier and customer address
        const bounds = L.latLngBounds([courierPos, deliveryPos]);
        map.fitBounds(bounds, { padding: [50, 50] });
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
    if (courierMarkerRef.current && courierPos) {
      courierMarkerRef.current.setLatLng(courierPos);
    }
  }, [courierPos]);

  return (
    <div style={{ maxWidth: "1040px", margin: "1rem auto" }}>
      {/* Header and Connection status indicator */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ margin: 0 }}>Live Courier Tracking #{order.id}</h1>
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
            {connected ? "SSE Stream Connected (Live)" : "Stream Disconnected"}
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "1.5rem" }}>
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
            style={{ height: "420px", width: "100%", background: "var(--brand-light)" }}
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
              <p style={{ margin: "0.4rem 0" }}>
                <strong>Destination:</strong> {order.neighbourhood || "Bole"}, Addis Ababa
              </p>
              <p style={{ margin: "0.4rem 0" }}>
                <strong>Courier Coordinates:</strong> {courierPos[0].toFixed(4)}° N, {courierPos[1].toFixed(4)}° E
              </p>
              <p style={{ margin: "0.4rem 0" }}>
                <strong>Order Total:</strong> {etb.format(order.total)}
              </p>
            </div>

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem", marginTop: "1rem" }}>
              <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem" }}>Ordered Items</h4>
              {order.items?.map((item, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", color: "var(--muted)" }}>
                  <span>{item.name} × {item.qty}</span>
                  <span style={{ color: "var(--text)" }}>{etb.format(item.price * item.qty)}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem" }}>
            <Link href="/orders" className="btn-ghost" style={{ fontSize: "0.85rem" }}>
              ← All Orders
            </Link>
            <Link href="/menu" className="btn-primary" style={{ fontSize: "0.85rem" }}>
              Order Again
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
