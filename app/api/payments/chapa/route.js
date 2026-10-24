import { NextResponse } from "next/server";
import { flushData, syncData } from "@/lib/datastore";
import { hasPaymentReference } from "@/lib/orders";
import { confirmOrderPayment } from "@/lib/order-payment";

export const dynamic = "force-dynamic";

// Chapa reports payments here (a callback GET and/or a webhook POST). What it
// sends is only a hint: the payment is checked with Chapa's verify endpoint
// before the order is marked paid, so a forged request can't pay an order.
const REFERENCE_RE = /^addis-(\d+)-[0-9a-f]{12}$/;

async function handle(reference) {
  const match = REFERENCE_RE.exec(String(reference || ""));
  if (!match) return NextResponse.json({ ok: true });
  await syncData();
  const orderId = match[1];
  if (hasPaymentReference(orderId, reference)) {
    await confirmOrderPayment(orderId);
    await flushData();
  }
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  return handle(params.get("trx_ref") || params.get("tx_ref"));
}

export async function POST(request) {
  const body = await request.json().catch(() => null);
  return handle(body?.tx_ref || body?.trx_ref || body?.data?.tx_ref);
}
