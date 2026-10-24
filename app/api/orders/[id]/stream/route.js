import { getOrderForUser, toOrderTrackingData } from "@/lib/orders";
import { getSession } from "@/lib/session";
import { syncData } from "@/lib/datastore";

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

      let closed = false;
      const interval = setInterval(async () => {
        // Load the latest data first: on Vercel the courier's location update
        // may have been saved by a different server instance.
        try {
          await syncData();
        } catch {}
        if (closed) return;
        const currentOrder = getOrderForUser(id, user.id, user.role);

        if (!currentOrder || currentOrder.status === "delivered" || currentOrder.status === "cancelled") {
          clearInterval(interval);
          closed = true;
          try {
            if (currentOrder) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(toOrderTrackingData(currentOrder))}\n\n`));
            }
            controller.close();
          } catch {}
          return;
        }

        const update = {
          ...toOrderTrackingData(currentOrder),
          serverTime: new Date().toISOString(),
        };

        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(update)}\n\n`));
        } catch {
          // The customer closed the page between ticks.
          closed = true;
          clearInterval(interval);
        }
      }, 5000);

      // Clean up when client disconnects
      request.signal.addEventListener("abort", () => {
        closed = true;
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
