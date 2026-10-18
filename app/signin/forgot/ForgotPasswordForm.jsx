"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/app/actions";

export function ForgotPasswordForm({ initialEmail = "" }) {
  const [state, setState] = useState({ pending: false, error: "", sentTo: "" });

  async function handleSubmit(event) {
    event.preventDefault();
    setState({ pending: true, error: "", sentTo: "" });
    const result = await requestPasswordReset(new FormData(event.currentTarget));
    setState({ pending: false, error: result?.ok ? "" : result?.error || "Something went wrong.", sentTo: result?.ok ? result.email : "" });
  }

  if (state.sentTo) {
    return (
      <div className="field-success-box" role="status">
        <p>
          If <strong>{state.sentTo}</strong> has an Addis Eats account, we&apos;ve emailed it a link to choose a new
          password. Open the link on this device; it expires after one hour.
        </p>
        <Link href="/signin" className="btn-secondary btn-block">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" defaultValue={initialEmail} placeholder="name@example.com" required autoComplete="email" />
      </div>
      {state.error && <p className="field-error" role="alert">{state.error}</p>}
      <button type="submit" className="btn-primary btn-block" disabled={state.pending}>
        {state.pending ? "Sending…" : "Email me a reset link"}
      </button>
    </form>
  );
}
