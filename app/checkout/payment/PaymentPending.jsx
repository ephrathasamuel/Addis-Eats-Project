"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cancelOrder, payCashInsteadAction, retryOrderPaymentAction } from "@/app/actions";

// The payment step. "Pay with Chapa" opens Chapa's payment page in its own
// window (inside our page it can't keep its session: browsers block its
// cookies there). Meanwhile this page keeps asking the server whether Chapa
// has confirmed the payment; as soon as it has, it closes the Chapa window and
// shows the confirmation. Nothing reaches the kitchen until the payment is
// confirmed or the customer switches to cash.
export function PaymentPending({ orderId, total, checkoutUrl }) {
  const router = useRouter();
  const popupRef = useRef(null);
  const [state, setState] = useState({ pending: "", error: "" });
  const [checking, setChecking] = useState(false);
  const [windowState, setWindowState] = useState("idle"); // idle | open | closed

  function goToConfirmation() {
    try {
      popupRef.current?.close();
    } catch {}
    window.location.assign(`/checkout/confirmation?order=${orderId}&paid=1`);
  }

  useEffect(() => {
    let stopped = false;
    let timer = null;
    async function poll() {
      try {
        const response = await fetch(`/api/orders/${orderId}/payment`, { cache: "no-store" });
        const data = await response.json();
        if (stopped) return;
        if (data.paid) {
          goToConfirmation();
          return;
        }
        if (data.status === "cancelled") {
          router.refresh();
          return;
        }
      } catch {}
      if (stopped) return;
      if (popupRef.current?.closed) setWindowState((current) => (current === "open" ? "closed" : current));
      timer = setTimeout(poll, 3000);
    }
    timer = setTimeout(poll, 3000);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
    // goToConfirmation only uses the ref and orderId.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, router]);

  function openChapa() {
    setState({ pending: "", error: "" });
    const popup = window.open(checkoutUrl, "chapa-payment");
    if (!popup) {
      // Pop-ups blocked: go to Chapa in this tab instead.
      window.location.assign(checkoutUrl);
      return;
    }
    popupRef.current = popup;
    setWindowState("open");
  }

  async function run(kind, action) {
    setState({ pending: kind, error: "" });
    const result = await action(orderId);
    if (result?.payUrl) {
      // A fresh Chapa page was created; reload to pick it up.
      window.location.reload();
      return;
    }
    if (result?.ok) {
      router.push(kind === "cancel" ? "/cart" : `/checkout/confirmation?order=${orderId}`);
      router.refresh();
      return;
    }
    setState({ pending: "", error: result?.error || "Something went wrong. Please try again." });
  }

  async function checkNow() {
    setChecking(true);
    try {
      const data = await (await fetch(`/api/orders/${orderId}/payment`, { cache: "no-store" })).json();
      if (data.paid) {
        goToConfirmation();
        return;
      }
      setState({ pending: "", error: "Chapa hasn't confirmed the payment yet. If you just paid, give it a moment." });
    } finally {
      setChecking(false);
    }
  }

  if (!checkoutUrl) {
    return (
      <section className="card-panel payment-pending">
        <h1>Payment not completed</h1>
        <p>
          We haven&apos;t received the payment for order #{orderId} ({total} ETB) yet, so the kitchen hasn&apos;t started
          it. If you just paid, wait a moment and tap &quot;Check again&quot;.
        </p>
        {state.error && <p className="field-error" role="alert">{state.error}</p>}
        <div className="payment-pending__actions">
          <button type="button" className="btn-primary" disabled={Boolean(state.pending)} onClick={() => run("retry", retryOrderPaymentAction)}>
            {state.pending === "retry" ? "Opening payment…" : "Check again / pay now"}
          </button>
          <CashAndCancel state={state} run={run} />
        </div>
      </section>
    );
  }

  return (
    <section className="card-panel payment-pending">
      <h1>Pay {total} ETB</h1>
      {windowState === "idle" && (
        <p className="text-muted payment-pending__lead">
          Pay with telebirr, CBE Birr or card on Chapa. Once Chapa confirms it, you&apos;ll come straight back to your order.
        </p>
      )}
      {windowState === "open" && (
        <p className="payment-pending__waiting" role="status">
          <span className="status-dot status-dot--open" aria-hidden="true" /> Waiting for Chapa… Finish paying in the Chapa
          window; this page moves on by itself.
        </p>
      )}
      {windowState === "closed" && (
        <p className="payment-pending__waiting" role="status">
          The Chapa window was closed before the payment came through. Tap &quot;Pay with Chapa&quot; to try again.
        </p>
      )}
      {state.error && <p className="field-error" role="alert">{state.error}</p>}
      <div className="payment-pending__actions">
        <button type="button" className="btn-primary payment-pending__pay" onClick={openChapa}>
          {windowState === "idle" ? "Pay with Chapa" : "Open Chapa again"}
        </button>
        {windowState !== "idle" && (
          <button type="button" className="btn-secondary" disabled={checking} onClick={checkNow}>
            {checking ? "Checking…" : "I've paid, check now"}
          </button>
        )}
      </div>
      <div className="payment-pending__actions payment-pending__actions--minor">
        <CashAndCancel state={state} run={run} />
        <button type="button" className="link-button" disabled={Boolean(state.pending)} onClick={() => run("retry", retryOrderPaymentAction)}>
          {state.pending === "retry" ? "Starting…" : "Payment failed or expired? Start a new one"}
        </button>
      </div>
    </section>
  );
}

function CashAndCancel({ state, run }) {
  return (
    <>
      <button type="button" className="btn-secondary" disabled={Boolean(state.pending)} onClick={() => run("cash", payCashInsteadAction)}>
        {state.pending === "cash" ? "Switching…" : "Pay cash on delivery instead"}
      </button>
      <button type="button" className="btn-ghost" disabled={Boolean(state.pending)} onClick={() => run("cancel", (id) => cancelOrder(id))}>
        {state.pending === "cancel" ? "Cancelling…" : "Cancel order"}
      </button>
    </>
  );
}
