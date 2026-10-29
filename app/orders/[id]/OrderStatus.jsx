"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import Link from "next/link";
import { confirmDeliveryAction, submitOrderReviewAction, editOrderReviewAction, cancelOrder } from "@/app/actions";
import { Avatar, Toast } from "@/components/Modal";
import { PushToggle } from "@/components/PushToggle";
import { useT } from "@/components/Providers";

export function OrderStatus({ id, initial, back = { href: "/orders", label: "Back to order history" } }) {
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

  // Cancel Request is allowed only within 3 minutes of placing the order
  const orderTime = new Date(current.createdAt).getTime();
  const isCancellable =
    current.status === "placed" &&
    !isNaN(orderTime) &&
    Date.now() - orderTime < 3 * 60 * 1000;

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
  const [courierRating, setCourierRating] = useState(current.courierRating || 0);
  const [cookRating, setCookRating] = useState(current.cookRating || 0);
  // Rating the cook and courier is something the customer opts into.
  const [ratePeople, setRatePeople] = useState(Boolean(current.courierRating || current.cookRating));
  const [reviewToast, setReviewToast] = useState("");
  const cookName = current.kitchenStaffName || "";
  const courierName = current.courier?.name || current.courierName || "";
  const tr = useT();
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [editingReview, setEditingReview] = useState(false);
  // Reviews can be changed for 48 hours after first posting.
  // Older reviews have no reviewedAt; count their 48 hours from receipt/delivery.
  const reviewStart = current.reviewedAt || current.receivedAt || current.deliveredAt;
  const reviewedAtMs = reviewStart ? new Date(reviewStart).getTime() : NaN;
  const canEditReview = Number.isFinite(reviewedAtMs) && Date.now() - reviewedAtMs < 48 * 60 * 60 * 1000;

  const getStatusBadge = (status) => {
    switch (status) {
      case "delivered":
        return { label: "Delivered", bg: "rgba(34, 197, 94, 0.15)", color: "#16a34a" };
      case "on-the-way":
        return { label: "Courier On The Way", bg: "rgba(37, 99, 235, 0.15)", color: "#2563eb" };
      case "served":
        return current.courier
          ? { label: "Courier Picking Up Your Food", bg: "rgba(37, 99, 235, 0.12)", color: "#2563eb" }
          : { label: "Ready, Waiting for a Courier", bg: "rgba(245, 158, 11, 0.15)", color: "#d97706" };
      case "preparing":
        return { label: "Cooking in Kitchen", bg: "rgba(245, 158, 11, 0.15)", color: "#d97706" };
      case "cancelled":
        return { label: "Cancelled", bg: "rgba(239, 68, 68, 0.15)", color: "#dc2626" };
      case "awaiting-payment":
        return { label: "Waiting for Payment", bg: "rgba(245, 158, 11, 0.15)", color: "#d97706" };
      default:
        return { label: "Order Placed", bg: "var(--brand-light)", color: "var(--brand-dark)" };
    }
  };

  const rawBadge = getStatusBadge(current.status);
  const badge = { ...rawBadge, label: tr(rawBadge.label) };

  // Cooking time comes from the kitchen's real averages; drive time from the
  // road (or live traffic) when the customer shared a pin, otherwise the
  // neighborhood range.
  const kitchenMinutes = current.kitchenEstimate?.minutes;
  const driveText = current.driveEstimate ? `about ${current.driveEstimate.minutes} min` : current.estimatedEta || "15-20 mins";
  const etaLabel =
    current.status === "on-the-way" || current.status === "served"
      ? driveText
      : kitchenMinutes
      ? `${kitchenMinutes} min cooking + ${driveText} drive`
      : `${driveText} after cooking`;
  const etaNote = [
    kitchenMinutes && current.kitchenEstimate.basis !== "default" ? "Cooking time is our kitchen team's average for these dishes." : "",
    current.driveEstimate
      ? current.driveEstimate.source === "live-traffic"
        ? `Drive time uses live traffic (${current.driveEstimate.km} km).`
        : `Drive time is for ${current.driveEstimate.km} km by road in typical traffic.`
      : "Drive time is a neighborhood range.",
  ]
    .filter(Boolean)
    .join(" ");

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
    if (ratePeople && courierRating) formData.set("courierRating", String(courierRating));
    if (ratePeople && cookRating) formData.set("cookRating", String(cookRating));
    try {
      const result = isReviewed ? await editOrderReviewAction(formData) : await submitOrderReviewAction(formData);
      if (!result?.ok) {
        alert(result?.error || "Could not submit your review.");
        return;
      }
      setIsReviewed(true);
      setEditingReview(false);
      mutate();
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div style={{ maxWidth: "620px", margin: "1rem auto" }}>
      <Toast message={reviewToast} tone="success" onDone={() => setReviewToast("")} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0 }}>Order #{current.id}</h1>
      </div>

      <div
        className="order-status-card"
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

        {current.status !== "delivered" && current.status !== "cancelled" && (
          <div className="order-status-eta">
            <div style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>
              {current.status === "on-the-way" ? "Drive time" : "Estimated time"}
            </div>
            <div style={{ fontSize: "1.1rem", fontWeight: "600", color: "var(--text)", marginTop: "0.2rem" }}>
              {etaLabel}
            </div>
          </div>
        )}
      </div>

      {current.status === "awaiting-payment" && (
        <div className="payment-due-card" role="status">
          <strong>{tr("This order isn't paid yet")}</strong>
          <span>The kitchen starts cooking once your payment comes through.</span>
          <a href={`/checkout/payment?order=${current.id}`} className="btn-primary">{tr("Finish payment")}</a>
        </div>
      )}
      {current.payment?.status === "paid" && current.status !== "cancelled" && (
        <p className="paid-online-note">Paid online{current.payment.via ? ` with ${current.payment.via}` : ""}. Nothing to pay at the door.</p>
      )}
      {current.courier && <CourierCard courier={current.courier} delivered={current.status === "delivered"} />}
      {current.deliveryCode && current.courier && ["served", "on-the-way"].includes(current.status) && (
        <div className="delivery-code-card" role="note">
          <span className="delivery-code-card__label">{tr("Your delivery code")}</span>
          <strong className="delivery-code-card__code">{current.deliveryCode}</strong>
          <span className="text-muted">{tr("Tell this code to your courier when your food arrives. Don't share it before then.")}</span>
        </div>
      )}

      {!isFinished && (
        <div style={{ marginBottom: "1.25rem" }}>
          <PushToggle purpose="Get a notification when your food is cooking, picked up, on the way and delivered." />
        </div>
      )}

      {/* What is happening now, and how the estimate was worked out */}
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
            <span><strong>On the way:</strong> your courier has your food and is driving to {current.location}.</span>
          ) : current.status === "served" ? (
            current.courier ? (
              <span><strong>Courier assigned:</strong> {current.courier.name} is collecting your food from the kitchen and will set off shortly.</span>
            ) : (
              <span><strong>Ready:</strong> your food is cooked and packed. A courier will pick it up shortly.</span>
            )
          ) : current.status === "preparing" ? (
            <span><strong>Cooking:</strong> a cook is preparing your food now.</span>
          ) : (
            <span><strong>Received:</strong> your order is in the kitchen queue and a cook will pick it up shortly.</span>
          )}
          <div style={{ marginTop: "0.4rem", color: "var(--muted)" }}>{etaNote}</div>
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
          ) : isReviewed && !editingReview ? (
            /* Review display: the latest version in bold, the first one faded below */
            <div className="review-block">
              <div className="review-current">
                <div className="review-current__top">
                  <strong>{current.originalReview ? "Your updated review" : "Your review"}</strong>
                  <span className="review-stars">{"★".repeat(current.reviewRating || rating)}{"☆".repeat(5 - (current.reviewRating || rating))}</span>
                </div>
                {(current.reviewComment ?? comment) && <p className="review-current__text">&quot;{current.reviewComment ?? comment}&quot;</p>}
              </div>
              {current.originalReview && (
                <div className="review-original">
                  <div className="review-current__top">
                    <span>Original review</span>
                    <span>{"★".repeat(current.originalReview.rating)}{"☆".repeat(5 - current.originalReview.rating)}</span>
                  </div>
                  {current.originalReview.comment && <p>&quot;{current.originalReview.comment}&quot;</p>}
                </div>
              )}
              {canEditReview && (
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ marginTop: "0.75rem" }}
                  onClick={() => {
                    setRating(current.reviewRating || rating);
                    setComment(current.reviewComment ?? comment);
                    setEditingReview(true);
                    // Explained once per device, as a pop-up rather than permanent text.
                    try {
                      if (!window.localStorage.getItem("addis-review-edit-hint")) {
                        window.localStorage.setItem("addis-review-edit-hint", "1");
                        setReviewToast("Your first review stays on the order, shown lighter, under the new one.");
                      }
                    } catch {}
                  }}
                >
                  Edit review
                </button>
              )}
            </div>
          ) : (
            /* Review & Rating Form */
            <form onSubmit={handleReviewSubmit}>
              <div style={{ marginBottom: "0.85rem" }}>
                <h3 style={{ margin: "0 0 0.35rem", fontSize: "1.15rem" }}>{editingReview ? "Update your review" : "How was your food?"}</h3>
                {!editingReview && (
                  <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--muted)" }}>
                    Thank you for confirming receipt! Tell us what you thought of the food.
                  </p>
                )}
              </div>

              {/* Star selector */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem", gap: "0.35rem" }}>
                <span style={{ fontSize: "0.95rem", fontWeight: "650", color: "var(--text)", textAlign: "center" }}>
                  The food
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

              {(cookName || courierName) && !ratePeople && (
                <button type="button" className="rate-people-toggle" onClick={() => setRatePeople(true)}>
                  {cookName && courierName
                    ? `Rate your cook, ${cookName}, and courier, ${courierName}`
                    : cookName
                    ? `Rate your cook, ${cookName}`
                    : `Rate your courier, ${courierName}`}
                </button>
              )}
              {ratePeople && (
                <div className="people-ratings">
                  {cookName && (
                    <PersonStars role="cook" title="Your cook" name={cookName} value={cookRating} onChange={setCookRating} />
                  )}
                  {courierName && (
                    <PersonStars role="courier" title="Your courier" name={courierName} value={courierRating} onChange={setCourierRating} />
                  )}
                  <button
                    type="button"
                    className="people-ratings__skip"
                    onClick={() => {
                      setRatePeople(false);
                      setCookRating(0);
                      setCourierRating(0);
                    }}
                  >
                    Skip rating people
                  </button>
                </div>
              )}

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
                {editingReview ? "Save updated review" : "Submit"}
              </button>
              {editingReview && (
                <button type="button" className="btn-ghost" style={{ width: "100%", marginTop: "0.5rem" }} onClick={() => setEditingReview(false)}>
                  Cancel
                </button>
              )}
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

      {/* The live map only matters until the food arrives. */}
      <div className={`order-actions order-actions--${2 + (isFinished ? 0 : 1) + (isCancellable ? 1 : 0)}`}>
        <Link href={back.href} className="btn-ghost">
          ← {tr(back.label)}
        </Link>
        <Link href="/menu" className="btn-primary">
          Order more dishes
        </Link>
        {!isFinished && (
          <Link href={`/track/${current.id}`} className="btn-secondary">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
              <line x1="9" y1="3" x2="9" y2="18" />
              <line x1="15" y1="6" x2="15" y2="21" />
            </svg>
            <span>Track on Live Map</span>
          </Link>
        )}
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

// Shown from the moment a courier accepts the order.
// Stars for one person (the cook or the courier), clearly labelled with who it is.
function PersonStars({ role, title, name, value, onChange }) {
  return (
    <div className="person-stars">
      <div className="person-stars__who">
        <span className="person-stars__title">{title}</span>
        <strong>{name}</strong>
      </div>
      <div className="person-stars__stars" role="radiogroup" aria-label={`${title}: ${name}`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star === 1 ? "" : "s"} for the ${role}`}
            className={star <= value ? "is-on" : ""}
            onClick={() => onChange(star === value ? 0 : star)}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

function CourierCard({ courier, delivered }) {
  return (
    <div className="courier-card">
      <Avatar name={courier.name} photo={courier.photo} size={60} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="courier-card__label">{delivered ? "Delivered by" : "Your courier"}</div>
        <div className="courier-card__name">{courier.name}</div>
        {courier.phone && !delivered && (
          <a href={`tel:${courier.phone}`} className="call-button" style={{ marginTop: "0.5rem" }}>
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" /></svg> Call your courier · {courier.phone}
          </a>
        )}
      </div>
    </div>
  );
}
