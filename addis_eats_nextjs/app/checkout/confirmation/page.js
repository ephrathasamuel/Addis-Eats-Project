import { getOrder, getOrderFromCookies } from "@/lib/orders";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ClearCartOnMount } from "@/components/ClearCartOnMount";

export const dynamic = "force-dynamic";

export default async function ConfirmationPage({ searchParams }) {
  const params = await searchParams;
  const orderId = params?.order;

  let order = orderId ? getOrder(orderId) : null;

  if (!order && orderId) {
    const cookieStore = await cookies();
    order = getOrderFromCookies(orderId, cookieStore);
  }

  if (!order) {
    notFound();
  }

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

        <h1 className="confirmation-title">Order Placed Successfully</h1>
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
            <p>Your food is being cooked and it will be on the way soon.</p>
          </div>
        </div>

        {/* Order Quick Details */}
        <div className="confirmation-details-box">
          <div className="confirmation-detail-item">
            <span className="confirmation-detail-label">Order Number</span>
            <strong className="confirmation-detail-val">#{order.id}</strong>
          </div>
          <div className="confirmation-detail-item">
            <span className="confirmation-detail-label">Total Amount</span>
            <strong className="confirmation-detail-val">{order.total} ETB</strong>
          </div>
          <div className="confirmation-detail-item">
            <span className="confirmation-detail-label">Delivery To</span>
            <strong className="confirmation-detail-val">{order.location || "Addis Ababa"}</strong>
          </div>
          <div className="confirmation-detail-item">
            <span className="confirmation-detail-label">Status</span>
            <strong className="confirmation-detail-val status-badge-pill">Preparing in Kitchen</strong>
          </div>
        </div>

        {/* Real time Tracking Box */}
        <div className="confirmation-tracking-prompt">
          <h3>Track Your Order Live</h3>
          <p>
            Watch real time status updates with automatic 5 second polling. You will receive notification as soon as your food leaves the kitchen.
          </p>
        </div>

        {/* Responsive Touch-Friendly Actions */}
        <div className="confirmation-actions">
          <Link href={`/orders/${order.id}`} className="btn-primary confirmation-btn">
            View Live Order Status
          </Link>
          <Link href="/menu" className="btn-ghost confirmation-btn">
            Back to Menu
          </Link>
        </div>
      </div>
    </div>
  );
}
