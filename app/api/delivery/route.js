import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getDeliveryOrdersFor } from "@/lib/orders";

export const dynamic = "force-dynamic";

// The courier board: the open pickup pool plus this courier's own deliveries.
export async function GET() {
  const user = await getSession();
  if (!user || (user.role !== "delivery" && user.role !== "admin")) {
    return NextResponse.json({ error: "Courier sign-in required." }, { status: 403 });
  }
  return NextResponse.json(
    { orders: getDeliveryOrdersFor(user.id, user.role === "admin") },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
