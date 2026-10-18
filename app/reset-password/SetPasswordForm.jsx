"use client";

import { useState } from "react";
import Link from "next/link";
import { setNewPassword } from "@/app/actions";
import PasswordInput from "@/components/PasswordInput";

export function SetPasswordForm() {
  const [state, setState] = useState({ pending: false, error: "", done: false });

  async function handleSubmit(event) {
    event.preventDefault();
    setState({ pending: true, error: "", done: false });
    const result = await setNewPassword(new FormData(event.currentTarget));
    setState({ pending: false, error: result?.ok ? "" : result?.error || "Something went wrong.", done: Boolean(result?.ok) });
  }

  if (state.done) {
    return (
      <div className="field-success-box" role="status">
        <p>Your password is saved. You can now sign in with your email and this password{" "}(Google sign-in still works too, if you use it).</p>
        <Link href="/menu" className="btn-primary btn-block">
          Continue to the menu
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="newPassword">New password</label>
        <PasswordInput id="newPassword" name="newPassword" autoComplete="new-password" minLength={8} placeholder="At least 8 characters" />
      </div>
      <div className="field">
        <label htmlFor="confirmPassword">Repeat new password</label>
        <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" minLength={8} />
      </div>
      {state.error && <p className="field-error" role="alert">{state.error}</p>}
      <button type="submit" className="btn-primary btn-block" disabled={state.pending}>
        {state.pending ? "Saving…" : "Save password"}
      </button>
    </form>
  );
}
