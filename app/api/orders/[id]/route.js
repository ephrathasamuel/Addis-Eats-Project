import { NextResponse } from "next/server";
import { getOrder, getOrderFromCookies } from "@/lib/orders";
import { cookies } from "next/headers";

export async function GET(request, { params }) {
  const { id } = await params;
  let order = getOrder(id);

  if (!order && id) {
    const cookieStore = await cookies();
    order = getOrderFromCookies(id, cookieStore);
  }

  if (!order) {
    return NextResponse.json({ error: `Order #${id} not found.` }, { status: 404 });
  }

  return NextResponse.json(order);
}
