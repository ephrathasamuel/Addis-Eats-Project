import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getOrderForUser, getOrderFromCookies } from "@/lib/orders";
import { getSession } from "@/lib/session";

export async function GET(request, { params }) {
  const { id } = await params;
  const user = await getSession();
  const cookieStore = await cookies();
  getOrderFromCookies(id, cookieStore);

  const order = getOrderForUser(id, user?.id, user?.role);

  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  return NextResponse.json(order);
}
