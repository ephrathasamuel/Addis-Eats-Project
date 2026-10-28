"use client";

import { useState } from "react";
import { openKitchenTablet } from "@/app/actions";
import PasswordInput from "@/components/PasswordInput";

// Opens this device as the kitchen tablet with a cook's or the admin's own
// email and password (the same ones they use everywhere else).
export function TabletSignIn({ signedInAs }) {
  const [state, setState] = useState({ pending: false, error: "" });

  async function submit(event) {
    event.preventDefault();
    setState({ pending: true, error: "" });
    const result = await openKitchenTablet(new FormData(event.currentTarget));
    if (result?.ok) {
      // Full reload so the header and every part of the page see the tablet session.
      window.location.assign("/kitchen/tablet");
      return;
    }
    setState({ pending: false, error: result?.error || "Could not open the kitchen tablet." });
  }

  return (
    <div className="auth-card tablet-signin">
      <h1>Kitchen tablet</h1>
      <p className="text-muted">
        Set up this device as the shared kitchen tablet. Sign in with your own kitchen or admin account; after that,
        cooks claim tickets here with their PIN.
      </p>
      {signedInAs && (
        <p className="tablet-signin__note">
          {signedInAs} is signed in on this device. Opening the tablet signs them out here.
        </p>
      )}
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="tablet-email">Email</label>
          <input id="tablet-email" name="email" type="email" autoComplete="username" required />
        </div>
        <div className="field">
          <label htmlFor="tablet-password">Password</label>
          <PasswordInput id="tablet-password" name="password" autoComplete="current-password" />
        </div>
        {state.error && <p className="field-error" role="alert">{state.error}</p>}
        <button type="submit" className="btn-primary btn-block" disabled={state.pending}>
          {state.pending ? "Opening…" : "Open kitchen tablet"}
        </button>
      </form>
    </div>
  );
}
