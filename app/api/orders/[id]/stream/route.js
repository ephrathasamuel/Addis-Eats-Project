import { getOrderForUser, toOrderTrackingData } from "@/lib/orders";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const { id } = await params;
  const user = await getSession();
  const order = user ? getOrderForUser(id, user.id, user.role) : null;

  if (!order) {
    return new Response("Order not found", { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(toOrderTrackingData(order))}\n\n`));

      const interval = setInterval(() => {
        const currentOrder = getOrderForUser(id, user.id, user.role);

        if (!currentOrder || currentOrder.status === "delivered" || currentOrder.status === "cancelled") {
          if (currentOrder) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(toOrderTrackingData(currentOrder))}\n\n`));
          }
          clearInterval(interval);
          controller.close();
          return;
        }

        const update = {
          ...toOrderTrackingData(currentOrder),
          serverTime: new Date().toISOString(),
        };

        controller.enqueue(encoder.encode(`data: ${JSON.stringify(update)}\n\n`));
      }, 5000);

      // Clean up when client disconnects
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
