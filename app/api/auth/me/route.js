import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSession();

  if (!user) {
    return NextResponse.json(
      { authenticated: false, user: null },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      photo: user.photo || "",
    },
  }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
