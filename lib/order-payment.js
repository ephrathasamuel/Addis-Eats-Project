import "server-only";
import { getOrder, markOrderPaid } from "@/lib/orders";
import { checkPayment } from "@/lib/payments";
import { notifyRole } from "@/lib/push";

// Server-only on purpose: these must never be callable from a browser.

export function notifyKitchenOfOrder(order) {
  notifyRole("staff", {
    title: `New order #${order.id}`,
    body: order.items.map((item) => `${item.qty}× ${item.name}`).join(", "),
    url: "/kitchen",
    tag: "kitchen-new",
  });
}

/**
 * Asks Chapa about the order's payment attempts (newest first) and, if one went
 * through for the full amount, marks the order paid and tells the kitchen.
 * Reads the order from the store by id, never from what a caller passes in.
 */
export async function confirmOrderPayment(orderOrId) {
  const order = getOrder(typeof orderOrId === "object" ? orderOrId?.id : orderOrId);
  if (!order) return { paid: false };
  if (order.payment?.status === "paid") return { paid: true };
  if (order.status !== "awaiting-payment") return { paid: false };
  for (const reference of [...(order.payment?.references || [])].reverse()) {
    const result = await checkPayment(reference, order.total);
    if (result?.paid) {
      const marked = markOrderPaid(order.id, {
        reference,
        amount: result.amount,
        method: result.method,
        chapaReference: result.chapaReference,
      });
      if (marked.changed) notifyKitchenOfOrder(order);
      return { paid: true };
    }
  }
  return { paid: false };
}
