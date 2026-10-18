import { NextResponse } from "next/server";
import { normalizeEthiopianPhone, parseDeliveryCoordinates, validateOrder } from "@/lib/validation";
import { createOrder, priceOrderItems, toOrderClientData } from "@/lib/orders";
import { getSession } from "@/lib/session";
import { quoteDelivery } from "@/lib/pricing";
import { estimateDrive } from "@/lib/routing";
import { flushData } from "@/lib/datastore";

// The API shares checkout validation and only creates orders for the signed-in customer.
// Prices and fees are recomputed from the live menu; client-sent prices are ignored.

export async function POST(request) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (user.role !== "customer") {
    return NextResponse.json({ error: "Only customer accounts can place orders." }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Order body must be a JSON object." }, { status: 422 });
  }

  const { valid, fieldErrors } = validateOrder(body);
  const deliveryCoordinates = parseDeliveryCoordinates(
    body?.deliveryCoordinates?.latitude,
    body?.deliveryCoordinates?.longitude
  );

  if (!valid || deliveryCoordinates === false) {
    if (deliveryCoordinates === false) {
      fieldErrors.deliveryCoordinates = "Delivery coordinates must be a valid location in Addis Ababa.";
    }
    return NextResponse.json({ fieldErrors }, { status: 422 });
  }

  const priced = priceOrderItems(body.items);
  if (!priced.ok) {
    return NextResponse.json({ error: priced.error }, { status: 422 });
  }

  const location = typeof body.location === "string" && body.location.trim() ? body.location.trim() : "Bole";
  const driveEstimate = deliveryCoordinates ? await estimateDrive(deliveryCoordinates) : null;
  const quote = await quoteDelivery({ location, pinEstimate: driveEstimate });
  const order = createOrder({
    userId: user.id,
    name: String(body.name).trim(),
    phone: normalizeEthiopianPhone(body.phone),
    items: priced.items,
    foodTotal: priced.foodTotal,
    location,
    addressDetails: typeof body.addressDetails === "string" ? body.addressDetails.trim() : "",
    deliveryCoordinates,
    driveEstimate,
    quote,
  });

  await flushData();
  return NextResponse.json(toOrderClientData(order), {
    status: 201,
    headers: { "Cache-Control": "private, no-store" },
  });
}
