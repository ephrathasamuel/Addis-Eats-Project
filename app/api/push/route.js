import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { flushData } from "@/lib/datastore";
import { getPushPublicKey, removeSubscription, saveSubscription } from "@/lib/push";

export const dynamic = "force-dynamic";

// GET: the public key browsers need to subscribe.
export async function GET() {
  const publicKey = getPushPublicKey();
  return NextResponse.json({ publicKey }, { status: publicKey ? 200 : 503 });
}

// POST { subscription }: turn notifications on for the signed-in user.
export async function POST(request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Sign in to turn on notifications." }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!saveSubscription(user, body?.subscription)) {
    return NextResponse.json({ error: "Invalid subscription." }, { status: 400 });
  }
  await flushData();
  return NextResponse.json({ ok: true });
}

// DELETE { endpoint }: turn notifications off on this device.
export async function DELETE(request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await request.json().catch(() => null);
  removeSubscription(body?.endpoint);
  await flushData();
  return NextResponse.json({ ok: true });
}
