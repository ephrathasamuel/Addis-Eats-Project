import { NextResponse } from "next/server";
import { flushData, syncData } from "@/lib/datastore";
import { hasPaymentReference } from "@/lib/orders";
import { confirmOrderPayment } from "@/lib/order-payment";
import { orderIdFromReference, webhookSignatureOk } from "@/lib/payments";

export const dynamic = "force-dynamic";

// Chapa reports payments here (a callback and/or a webhook). What it sends is
// only a hint: the payment is checked with Chapa's verify endpoint before the
// order is marked paid, so a forged request can't pay an order.
async function handle(reference) {
  const orderId = orderIdFromReference(reference);
  if (!orderId) return NextResponse.json({ ok: true });
  await syncData();
  if (hasPaymentReference(orderId, reference)) {
    await confirmOrderPayment(orderId);
    await flushData();
  }
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  return handle(params.get("merchant_reference") || params.get("trx_ref") || params.get("tx_ref"));
}

export async function POST(request) {
  const raw = await request.text();
  if (!webhookSignatureOk(raw, request.headers.get("x-chapa-signature"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  let body = null;
  try {
    body = JSON.parse(raw);
  } catch {}
  return handle(
    body?.merchant_reference || body?.data?.merchant_reference || body?.tx_ref || body?.trx_ref || body?.data?.tx_ref
  );
}
