import { NextResponse } from "next/server";
import {
  getOrderForUser,
  toOrderClientData,
  toOrderTrackingData,
} from "@/lib/orders";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const { id } = await params;
  const user = await getSession();

  const order = user ? getOrderForUser(id, user.id, user.role) : null;

  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  return NextResponse.json(
    user.role === "delivery"
      ? toOrderTrackingData(order)
      : toOrderClientData(order),
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
