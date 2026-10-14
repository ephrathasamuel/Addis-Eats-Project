import { NextResponse } from "next/server";
import { validateOrder } from "@/lib/validation";
import { createOrder } from "@/lib/orders";
import { getSession } from "@/lib/session";

// The API shares checkout validation and only creates orders for the signed-in user.

export async function POST(request) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { valid, fieldErrors } = validateOrder(body);

  if (!valid) {
    return NextResponse.json({ fieldErrors }, { status: 422 });
  }

  const order = createOrder({
    userId: user.id,
    name: body.name,
    phone: body.phone,
    items: body.items,
    ownerToken: user.token,
  });

  return NextResponse.json(order, { status: 201 });
}
