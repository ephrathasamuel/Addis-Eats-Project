import { NextResponse } from "next/server";
import { parseDeliveryCoordinates } from "@/lib/validation";
import { updateCourierLocation } from "@/lib/orders";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  const user = await getSession();
  if (!user || user.role !== "delivery") {
    return NextResponse.json({ error: "Courier authentication required." }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const coordinates = parseDeliveryCoordinates(body?.latitude, body?.longitude);
  if (!coordinates) {
    return NextResponse.json(
      { error: "Provide valid latitude and longitude within Addis Ababa." },
      { status: 422 }
    );
  }

  const { id } = await params;
  const result = updateCourierLocation(
    id,
    user.id,
    coordinates.latitude,
    coordinates.longitude
  );
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status || 404 }
    );
  }

  return NextResponse.json({ ok: true }, {
    headers: { "Cache-Control": "no-store" },
  });
}
