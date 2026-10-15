import { NextResponse } from "next/server";
import { parseDeliveryCoordinates, validateOrder } from "@/lib/validation";
import {
  createOrder,
  getLocationDriveTime,
  getLocationFee,
  toOrderClientData,
} from "@/lib/orders";
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

  const location = typeof body.location === "string" ? body.location.trim() : "Bole";
  const order = createOrder({
    userId: user.id,
    name: body.name,
    phone: body.phone,
    items: body.items,
    location,
    estimatedEta: getLocationDriveTime(location),
    deliveryFee: getLocationFee(location),
    deliveryCoordinates,
  });

  return NextResponse.json(toOrderClientData(order), {
    status: 201,
    headers: { "Cache-Control": "private, no-store" },
  });
}
