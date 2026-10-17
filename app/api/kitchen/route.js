import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getKitchenSnapshot } from "@/lib/kitchen";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSession();
  if (!user || (user.role !== "staff" && user.role !== "admin")) {
    return NextResponse.json({ error: "Kitchen staff sign-in required." }, { status: 403 });
  }
  return NextResponse.json(getKitchenSnapshot(), { headers: { "Cache-Control": "private, no-store" } });
}
