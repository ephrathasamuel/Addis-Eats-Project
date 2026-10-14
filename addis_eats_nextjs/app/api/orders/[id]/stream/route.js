import { getOrder } from "@/lib/orders";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const { id } = await params;
  const order = getOrder(id);

  if (!order) {
    return new Response("Order not found", { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // 1. Immediate initial event
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(order)}\n\n`));

      let step = 0;
      const interval = setInterval(() => {
        step++;
        const currentOrder = getOrder(id);

        if (!currentOrder || currentOrder.status === "delivered" || currentOrder.status === "cancelled" || step > 20) {
          if (currentOrder) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(currentOrder)}\n\n`));
          }
          clearInterval(interval);
          controller.close();
          return;
        }

        // Simulate courier moving towards destination in Addis Ababa
        const courierLat = 9.0150 - step * 0.0005;
        const courierLng = 38.7720 + step * 0.0006;

        const update = {
          ...currentOrder,
          courierLocation: [courierLat, courierLng],
          serverTime: new Date().toISOString(),
        };

        // Proper SSE Framing: data: <json>\n\n
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(update)}\n\n`));
      }, 3000);

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
