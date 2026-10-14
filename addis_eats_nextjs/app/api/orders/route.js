import { NextResponse } from "next/server";
import { validateOrder } from "@/lib/validation";
import { createOrder } from "@/lib/orders";
import { randomUUID } from "crypto";

// Same schema as the checkout form, enforced again here, because this
// endpoint can be called by anyone with curl -  not just our own UI.

export async function POST(request) {
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
    name: body.name,
    phone: body.phone,
    items: body.items,
    ownerToken: randomUUID(), // outside callers get an untraceable order
  });

  return NextResponse.json(order, { status: 201 });
}
