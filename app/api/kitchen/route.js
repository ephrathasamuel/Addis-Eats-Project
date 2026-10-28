import { NextResponse } from "next/server";
import { getSession, KITCHEN_TABLET_ROLE } from "@/lib/session";
import { getKitchenSnapshot } from "@/lib/kitchen";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSession();
  if (!user || !["staff", "admin", KITCHEN_TABLET_ROLE].includes(user.role)) {
    return NextResponse.json({ error: "Kitchen staff sign-in required." }, { status: 403 });
  }
  return NextResponse.json(getKitchenSnapshot(), { headers: { "Cache-Control": "private, no-store" } });
}
