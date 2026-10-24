"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelOrder, payCashInsteadAction, retryOrderPaymentAction } from "@/app/actions";

// The payment didn't go through (or isn't confirmed yet). Nothing reaches the
// kitchen until one of these is chosen.
export function PaymentPending({ orderId, total }) {
  const router = useRouter();
  const [state, setState] = useState({ pending: "", error: "" });

  async function run(kind, action) {
    setState({ pending: kind, error: "" });
    const result = await action(orderId);
    if (result?.payUrl) {
      window.location.assign(result.payUrl);
      return;
    }
    if (result?.ok) {
      router.push(kind === "cancel" ? "/cart" : `/checkout/confirmation?order=${orderId}`);
      router.refresh();
      return;
    }
    setState({ pending: "", error: result?.error || "Something went wrong. Please try again." });
  }

  return (
    <section className="card-panel payment-pending">
      <h1>Payment not completed</h1>
      <p>
        We haven&apos;t received the payment for order #{orderId} ({total} ETB) yet, so the kitchen hasn&apos;t started it.
        If you just paid, wait a moment and tap &quot;Check again&quot;.
      </p>
      {state.error && <p className="field-error" role="alert">{state.error}</p>}
      <div className="payment-pending__actions">
        <button type="button" className="btn-primary" disabled={Boolean(state.pending)} onClick={() => run("retry", retryOrderPaymentAction)}>
          {state.pending === "retry" ? "Opening payment…" : "Check again / pay now"}
        </button>
        <button type="button" className="btn-secondary" disabled={Boolean(state.pending)} onClick={() => run("cash", payCashInsteadAction)}>
          {state.pending === "cash" ? "Switching…" : "Pay cash on delivery instead"}
        </button>
        <button
          type="button"
          className="btn-ghost"
          disabled={Boolean(state.pending)}
          onClick={() => run("cancel", (id) => cancelOrder(id))}
        >
          {state.pending === "cancel" ? "Cancelling…" : "Cancel order"}
        </button>
      </div>
    </section>
  );
}
