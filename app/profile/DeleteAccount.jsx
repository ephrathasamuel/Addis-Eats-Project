"use client";

import { useState } from "react";
import { deleteMyAccountAction } from "@/app/actions";

// Customers can delete their own account. Collapsed until opened, and the
// email has to be typed so it can't happen by accident.
export function DeleteAccount({ email }) {
  const [typed, setTyped] = useState("");
  const [state, setState] = useState({ pending: false, error: "" });
  const matches = typed.trim().toLowerCase() === String(email || "").toLowerCase();

  async function remove(event) {
    event.preventDefault();
    if (!matches) return;
    setState({ pending: true, error: "" });
    const result = await deleteMyAccountAction(typed.trim());
    if (result?.ok) {
      try {
        window.localStorage.removeItem("addis-eats-cart");
        window.localStorage.removeItem("addis-eats-favorites");
        window.localStorage.removeItem("addis-share-location");
      } catch {}
      window.location.href = "/?account=deleted";
      return;
    }
    setState({ pending: false, error: result?.error || "Could not delete your account. Please try again." });
  }

  return (
    <details className="card-panel collapsible-panel delete-account">
      <summary>Delete my account</summary>
      <form onSubmit={remove}>
        <p className="text-muted" style={{ marginTop: 0 }}>
          This removes your account, your name, email and phone number. Your past orders stay in the
          restaurant&apos;s records without your details. This can&apos;t be undone.
        </p>
        <div className="field">
          <label htmlFor="delete-confirm">Type your email ({email}) to confirm</label>
          <input
            id="delete-confirm"
            type="email"
            autoComplete="off"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
          />
        </div>
        {state.error && <p className="field-error" role="alert">{state.error}</p>}
        <button type="submit" className="btn-danger" disabled={!matches || state.pending}>
          {state.pending ? "Deleting…" : "Delete my account"}
        </button>
      </form>
    </details>
  );
}
