"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import Link from "next/link";
import { confirmDeliveryAction, submitOrderReviewAction, cancelOrder } from "@/app/actions";
import { Avatar } from "@/components/Modal";

export function OrderStatus({ id, initial }) {
  const [cancelling, setCancelling] = useState(false);

  // SWR live polling every 5s, pausing when delivered or cancelled
  const { data: order, mutate } = useSWR(`/api/orders/${id}`, fetcher, {
    fallbackData: initial,
    refreshInterval: (latest) => {
      const status = latest?.status || initial?.status;
      return status === "delivered" || status === "cancelled" ? 0 : 5000;
    },
  });

  const current = order || initial;
  const isFinished = current.status === "delivered" || current.status === "cancelled";

  // Cancel Request is allowed only within 5 minutes of placing the order
  const orderTime = new Date(current.createdAt).getTime();
  const isCancellable =
    current.status === "placed" &&
    !isNaN(orderTime) &&
    Date.now() - orderTime < 5 * 60 * 1000;

  const handleCancelRequest = async () => {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    setCancelling(true);
    // Optimistic UI update
    mutate({ ...current, status: "cancelled" }, false);
    const res = await cancelOrder(current.id);
    setCancelling(false);
    if (!res?.ok) {
      alert(res?.error || "Could not cancel order.");
      mutate();
    }
  };

  const [confirmedReceived, setConfirmedReceived] = useState(Boolean(current.confirmedByCustomer));
  const [notYetReported, setNotYetReported] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const [isReviewed, setIsReviewed] = useState(Boolean(current.reviewed));
  const [rating, setRating] = useState(current.reviewRating || 5);
  const [comment, setComment] = useState(current.reviewComment || "");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const getStatusBadge = (status) => {
    switch (status) {
      case "delivered":
        return { label: "Delivered", bg: "rgba(34, 197, 94, 0.15)", color: "#16a34a" };
      case "on-the-way":
        return { label: "Courier On The Way", bg: "rgba(37, 99, 235, 0.15)", color: "#2563eb" };
      case "served":
        return { label: "Kitchen Served / Ready for Courier", bg: "rgba(245, 158, 11, 0.15)", color: "#d97706" };
      case "preparing":
        return { label: "Cooking in Kitchen", bg: "rgba(245, 158, 11, 0.15)", color: "#d97706" };
      case "cancelled":
        return { label: "Cancelled", bg: "rgba(239, 68, 68, 0.15)", color: "#dc2626" };
      default:
        return { label: "Order Placed", bg: "var(--brand-light)", color: "var(--brand-dark)" };
    }
  };

  const badge = getStatusBadge(current.status);

  const handleConfirmReceived = async () => {
    setIsConfirming(true);
    try {
      const result = await confirmDeliveryAction(current.id);
      if (!result?.ok) {
        alert(result?.error || "Could not confirm order receipt.");
        return;
      }
      setConfirmedReceived(true);
      mutate();
    } finally {
      setIsConfirming(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingReview(true);
    const formData = new FormData();
    formData.set("orderId", current.id);
    formData.set("rating", String(rating));
    formData.set("comment", comment);
    try {
      const result = await submitOrderReviewAction(formData);
      if (!result?.ok) {
        alert(result?.error || "Could not submit your review.");
        return;
      }
      setIsReviewed(true);
      mutate();
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div style={{ maxWidth: "620px", margin: "1rem auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0 }}>Order #{current.id}</h1>
        {!isFinished && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span
              style={{
                display: "inline-block",
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                backgroundColor: "var(--brand)",
                boxShadow: "0 0 8px currentColor",
                animation: "pulse 2s infinite",
              }}
            />
            <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
              Live polling (every 5s)
            </span>
          </div>
        )}
      </div>

      <div
        style={{
          padding: "1.25rem 1.5rem",
          borderRadius: "20px",
          backgroundColor: badge.bg,
          border: "1px solid var(--border)",
          marginBottom: "1rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.85rem",
        }}
      >
        <div>
          <div style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>
            Current Status
          </div>
          <div style={{ fontSize: "1.35rem", fontWeight: "700", color: badge.color, marginTop: "0.2rem" }}>
            {badge.label}
          </div>
        </div>

        {/* Hide Estimated Wait completely if status is delivered or cancelled */}
        {current.status !== "delivered" && current.status !== "cancelled" && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>
              Neighborhood Travel-Time Estimate
            </div>
            <div style={{ fontSize: "1.1rem", fontWeight: "600", color: "var(--text)", marginTop: "0.2rem" }}>
              {current.estimatedEta || "15-20 mins"}
            </div>
          </div>
        )}
      </div>

      {current.courier && <CourierCard courier={current.courier} delivered={current.status === "delivered"} />}

      {/* Explaining courier transit driving time vs cooking time */}
      {current.status !== "delivered" && current.status !== "cancelled" && (
        <div
          style={{
            padding: "0.85rem 1.15rem",
            borderRadius: "14px",
            backgroundColor: "var(--brand-light)",
            border: "1px solid var(--border)",
            marginBottom: "1.25rem",
            fontSize: "0.88rem",
            lineHeight: 1.5,
          }}
        >
          {current.status === "on-the-way" ? (
            <div>
              <strong>Delivery in Transit:</strong> Kitchen cooking is finished and your courier has picked up the order. Neighborhood estimate: <strong>{current.estimatedEta || "Unavailable"}</strong> (not traffic-aware).
              <div style={{ marginTop: "0.6rem" }}>
                <Link
                  href={`/track/${current.id}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    fontWeight: "750",
                    fontSize: "0.88rem",
                    color: "var(--brand-dark)",
                    textDecoration: "underline",
                  }}
                >
                  View delivery map &gt;
                </Link>
              </div>
            </div>
          ) : current.status === "served" ? (
            <div>
              <strong>Kitchen Finished:</strong> Cooking is complete and the dish has been served! The delivery courier is picking up your order right now to start driving to {current.location}.
              <div style={{ marginTop: "0.6rem" }}>
                <Link
                  href={`/track/${current.id}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    fontWeight: "750",
                    fontSize: "0.88rem",
                    color: "var(--brand-dark)",
                    textDecoration: "underline",
                  }}
                >
                  View delivery map &gt;
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <strong>In Kitchen:</strong> Addis Eats chefs are preparing your food (~15-20 mins cooking). The travel-time figure is a static neighborhood range, not a live route or traffic-aware ETA, and applies only after the courier picks up the order.
            </div>
          )}
        </div>
      )}

      {/* Admin Edited Audit Banner */}
      {current.adminEdited && (
        <div
          style={{
            padding: "0.85rem 1.15rem",
            borderRadius: "14px",
            backgroundColor: "rgba(124, 92, 255, 0.12)",
            border: "1px solid rgba(124, 92, 255, 0.3)",
            marginBottom: "1.25rem",
            fontSize: "0.88rem",
            lineHeight: 1.5,
            color: "var(--brand-dark)",
          }}
        >
          <strong>Notice:</strong> Management updated your order details ({current.adminEditedBy || "Admin"} at {new Date(current.adminEditedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}): {current.adminEditNote}
        </div>
      )}

      {/* Customer Receipt Confirmation & Review Workflow when Delivered */}
      {current.status === "delivered" && (
        <div
          style={{
            background: "var(--card-bg)",
            borderRadius: "20px",
            padding: "1.5rem",
            border: "1px solid var(--border)",
            boxShadow: "0 4px 14px var(--shadow-color)",
            marginBottom: "1.5rem",
          }}
        >
          {!confirmedReceived && !notYetReported ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <h3 style={{ margin: 0, fontSize: "1.15rem" }}>Confirm Food Arrival</h3>
              </div>
              <p style={{ margin: "0 0 1.25rem", color: "var(--muted)", fontSize: "0.92rem" }}>
                The courier indicated your food has arrived. Did you receive your order?
              </p>

              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={handleConfirmReceived}
                  disabled={isConfirming}
                  className="btn-primary"
                  style={{ padding: "0.6rem 1.2rem", fontSize: "0.95rem" }}
                >
                  {isConfirming ? "Confirming..." : "Yes, I received my food"}
                </button>
                <button
                  type="button"
                  onClick={() => setNotYetReported(true)}
                  className="btn-ghost"
                  style={{ padding: "0.6rem 1rem", fontSize: "0.95rem" }}
                >
                  Not yet
                </button>
              </div>
            </div>
          ) : notYetReported && !confirmedReceived ? (
            <div style={{ padding: "0.5rem 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#e67e22", marginBottom: "0.4rem" }}>
                <strong>Support Notified</strong>
              </div>
              <p style={{ margin: "0 0 1rem", fontSize: "0.9rem", color: "var(--muted)" }}>
                We have notified our delivery dispatch team to check with your driver. If your food arrives shortly, please confirm below:
              </p>
              <button
                type="button"
                onClick={handleConfirmReceived}
                className="btn-primary"
                style={{ fontSize: "0.88rem", padding: "0.5rem 1rem" }}
              >
                Food arrived! Confirm receipt
              </button>
            </div>
          ) : isReviewed ? (
            /* Review completed display */
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <strong style={{ fontSize: "1rem", color: "#16a34a" }}>
                  Review Submitted
                </strong>
                <span style={{ fontSize: "1.05rem", color: "#a855f7", fontWeight: "700" }}>
                  {"★".repeat(rating)}{"☆".repeat(5 - rating)}
                </span>
              </div>
              {comment && (
                <p style={{ margin: "0.4rem 0 0", fontSize: "0.9rem", fontStyle: "italic", color: "var(--muted)" }}>
                  &quot;{comment}&quot;
                </p>
              )}
            </div>
          ) : (
            /* Review & Rating Form */
            <form onSubmit={handleReviewSubmit}>
              <div style={{ marginBottom: "0.85rem" }}>
                <h3 style={{ margin: "0 0 0.35rem", fontSize: "1.15rem" }}>How was your food?</h3>
                <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--muted)" }}>
                  Thank you for confirming receipt! Rate and review your dishes below.
                </p>
              </div>

              {/* Star selector */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem", gap: "0.35rem" }}>
                <span style={{ fontSize: "0.95rem", fontWeight: "650", color: "var(--text)", textAlign: "center" }}>
                  Rating
                </span>
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.4rem" }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      style={{
                        background: "none",
                        border: "none",
                        fontSize: "1.85rem",
                        cursor: "pointer",
                        color: star <= rating ? "#a855f7" : "var(--border)",
                        padding: "0 0.15rem",
                        lineHeight: 1,
                        transition: "color 0.15s ease",
                      }}
                      title={`${star} Star`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: "1.25rem", width: "100%" }}>
                <label htmlFor="review-comment" style={{ fontWeight: "650", display: "block", marginBottom: "0.45rem", fontSize: "0.9rem" }}>
                  Your Review Comments
                </label>
                <input
                  type="text"
                  id="review-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tell us about the flavor, freshness, temperature, or packaging..."
                  required
                  style={{
                    width: "100%",
                    height: "48px",
                    borderRadius: "9999px",
                    padding: "0 1.25rem",
                    fontSize: "0.92rem",
                    border: "1.5px solid var(--border)",
                    backgroundColor: "var(--input-bg, #1a1a24)",
                    color: "var(--text, #f1f5f9)",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingReview}
                className="btn-primary"
                style={{
                  width: "100%",
                  padding: "0.75rem 1.5rem",
                  fontSize: "0.95rem",
                  borderRadius: "9999px",
                  cursor: isSubmittingReview ? "not-allowed" : "pointer",
                }}
              >
                Submit
              </button>
            </form>
          )}
        </div>
      )}

      <div
        style={{
          background: "var(--card-bg)",
          borderRadius: "20px",
          padding: "1.75rem",
          border: "1px solid var(--border)",
          boxShadow: "0 4px 12px var(--shadow-color)",
          marginBottom: "1.5rem",
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: "0.75rem" }}>Order Details</h3>
        <p style={{ margin: "0.3rem 0", color: "var(--muted)" }}>
          <strong style={{ color: "var(--text)" }}>Customer:</strong> {current.name} ({current.phone})
        </p>
        {current.location && (
          <p style={{ margin: "0.3rem 0", color: "var(--muted)" }}>
            <strong style={{ color: "var(--text)" }}>Delivery Destination:</strong> {current.location}
          </p>
        )}
        <p style={{ margin: "0.3rem 0", color: "var(--muted)" }}>
          <strong style={{ color: "var(--text)" }}>Placed at:</strong>{" "}
          {new Date(current.createdAt).toLocaleTimeString()}
        </p>

        <h3 style={{ marginTop: "1.5rem", marginBottom: "0.75rem" }}>Items Ordered</h3>
        <div className="profile-cart-list">
          {current.items?.map((item, idx) => {
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

        {/* Pricing Summary */}
        <div style={{ borderTop: "1px solid var(--border)", marginTop: "1.25rem", paddingTop: "0.75rem" }}>
          {current.deliveryFee ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", color: "var(--muted)", marginBottom: "0.35rem" }}>
                <span>Food Items</span>
                <span>{current.foodTotal || current.total - current.deliveryFee} ETB</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", color: "var(--muted)", marginBottom: "0.5rem" }}>
                <span>Delivery Fee ({current.location || "Addis Ababa"})</span>
                <span>+{current.deliveryFee} ETB</span>
              </div>
            </>
          ) : null}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "1.15rem",
              fontWeight: "700",
            }}
          >
            <span>Total Paid</span>
            <span style={{ color: "var(--brand-dark)" }}>{current.total} ETB</span>
          </div>
        </div>
      </div>

      <div className={`order-actions ${isCancellable ? "order-actions--four" : ""}`}>
        <Link href="/menu" className="btn-primary">
          Order more dishes
        </Link>
        <Link href={`/track/${current.id}`} className="btn-secondary">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
            <line x1="9" y1="3" x2="9" y2="18" />
            <line x1="15" y1="6" x2="15" y2="21" />
          </svg>
          <span>Track on Live Map</span>
        </Link>
        <Link href="/" className="btn-ghost">
          Return home
        </Link>
        {isCancellable && (
          <button
            type="button"
            onClick={handleCancelRequest}
            disabled={cancelling}
            className="cancel-request-btn"
          >
            {cancelling ? "Cancelling..." : "Cancel order"}
          </button>
        )}
      </div>
    </div>
  );
}

// Shown once a courier has picked up the order.
function CourierCard({ courier, delivered }) {
  return (
    <div className="courier-card">
      <Avatar name={courier.name} photo={courier.photo} size={60} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="courier-card__label">{delivered ? "Delivered by" : "Your courier"}</div>
        <div className="courier-card__name">{courier.name}</div>
        {courier.phone && !delivered && (
          <a href={`tel:${courier.phone}`} style={{ fontWeight: 650 }}>
            Call {courier.phone}
          </a>
        )}
      </div>
    </div>
  );
}
