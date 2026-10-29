import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getOrderForUser } from "@/lib/orders";
import { confirmOrderPayment } from "@/lib/order-payment";
import { flushData } from "@/lib/datastore";

export const dynamic = "force-dynamic";

// Polled by the payment page while the customer pays on Chapa: asks Chapa
// whether the payment went through and, if so, sends the order to the kitchen.
export async function GET(request, { params }) {
  const { id } = await params;
  const user = await getSession();
  const order = user?.role === "customer" ? getOrderForUser(String(id), user.id, "customer") : null;
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  let status = order.status;
  if (status === "awaiting-payment") {
    const { paid } = await confirmOrderPayment(order.id);
    await flushData();
    if (paid) status = "placed";
  }
  return NextResponse.json(
    { status, paid: status !== "awaiting-payment" && status !== "cancelled" },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
