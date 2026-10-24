import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getOrderForUser } from "@/lib/orders";
import { confirmOrderPayment } from "@/lib/order-payment";
import { PaymentPending } from "./PaymentPending";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Payment",
  robots: { index: false },
};

// Chapa sends the customer back here after paying (or giving up).
export default async function PaymentReturnPage({ searchParams }) {
  const orderId = String((await searchParams)?.order || "");
  const user = await getSession();
  if (!user) redirect(`/signin?next=${encodeURIComponent(`/checkout/payment?order=${orderId}`)}`);
  const order = getOrderForUser(orderId, user.id, "customer");
  if (!order) notFound();

  if (order.status === "awaiting-payment") {
    const { paid } = await confirmOrderPayment(order.id);
    if (paid) redirect(`/checkout/confirmation?order=${order.id}&paid=1`);
  } else if (order.status !== "cancelled") {
    redirect(`/checkout/confirmation?order=${order.id}${order.payment?.status === "paid" ? "&paid=1" : ""}`);
  }

  return (
    <div className="payment-return">
      {order.status === "cancelled" ? (
        <section className="card-panel">
          <h1>Order cancelled</h1>
          <p>Order #{order.id} was cancelled and nothing was charged.</p>
          <Link href="/menu" className="btn-primary">Back to the menu</Link>
        </section>
      ) : (
        <PaymentPending orderId={order.id} total={order.total} />
      )}
    </div>
  );
}
