import { getOrderForUser } from "@/lib/orders";
import { getSession } from "@/lib/session";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ClearCartOnMount } from "@/components/ClearCartOnMount";
import { Tr } from "@/components/Tr";

export const dynamic = "force-dynamic";

export default async function ConfirmationPage({ searchParams }) {
  const params = await searchParams;
  const orderId = params?.order;
  const user = await getSession();
  if (!user) redirect("/signin?next=/orders");
  const order = orderId ? getOrderForUser(orderId, user.id) : null;
  if (!order) {
    notFound();
  }
  // Not paid yet: the payment page explains and offers the choices.
  if (order.status === "awaiting-payment") redirect(`/checkout/payment?order=${order.id}`);
  const paidOnline = order.payment?.status === "paid";

  return (
    <div className="confirmation-page-wrapper">
      <ClearCartOnMount />

      <div className="confirmation-card">
        {/* Success Icon */}
        <div className="confirmation-icon-wrap" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>

        <h1 className="confirmation-title"><Tr text="Order Placed Successfully" /></h1>
        <p className="confirmation-greeting">
          Thank you, <strong>{order.name}</strong>. Your order has been received by our kitchen.
        </p>

        {/* Cooking Notification */}
        <div className="confirmation-cooking-banner">
          <div className="cooking-banner-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="cooking-banner-text">
            <strong>Kitchen Notification</strong>
            <p>Your order is in the kitchen queue. A cook will pick it up shortly.</p>
          </div>
        </div>

        {/* Order Quick Details */}
        <div className="confirmation-details-box">
          <div className="confirmation-detail-item">
            <span className="confirmation-detail-label"><Tr text="Order Number" /></span>
            <strong className="confirmation-detail-val">#{order.id}</strong>
          </div>
          <div className="confirmation-detail-item">
            <span className="confirmation-detail-label"><Tr text="Payment" /></span>
            <strong className="confirmation-detail-val"><Tr text={paidOnline ? "Paid online" : "Cash on delivery"} /></strong>
          </div>
          <div className="confirmation-detail-item">
            <span className="confirmation-detail-label"><Tr text="Total Amount" /></span>
            <strong className="confirmation-detail-val">{order.total} ETB</strong>
          </div>
          <div className="confirmation-detail-item">
            <span className="confirmation-detail-label">Delivery To</span>
            <strong className="confirmation-detail-val">{order.location || "Addis Ababa"}</strong>
          </div>
          <div className="confirmation-detail-item">
            <span className="confirmation-detail-label">Status</span>
            <strong className="confirmation-detail-val status-badge-pill">Sent to the kitchen</strong>
          </div>
        </div>

        {/* Tracking availability */}
        <div className="confirmation-tracking-prompt">
          <h3>Track Your Order</h3>
          <p>
            Your order page updates live, and once your courier sets off you can follow them on the map.
          </p>
        </div>

        {/* Responsive Touch-Friendly Actions */}
        <div className="confirmation-actions">
          <Link href={`/orders/${order.id}`} className="btn-primary confirmation-btn">
            View Live Order Status
          </Link>
          <Link
            href={`/track/${order.id}`}
            className="btn-secondary confirmation-btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45rem",
              backgroundColor: "var(--brand-light)",
              color: "var(--brand-dark)",
              border: "1px solid var(--border)",
              fontWeight: "650",
            }}
          >
            Open delivery map
          </Link>
          <Link href="/menu" className="btn-ghost confirmation-btn">
            Back to Menu
          </Link>
        </div>
      </div>
    </div>
  );
}
