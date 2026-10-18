"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { changeMyPinAction, changePasswordAction, requestPasswordReset, updateMyProfileAction } from "@/app/actions";
import PasswordInput from "@/components/PasswordInput";
import { ImagePicker } from "@/components/ImagePicker";
import { useSession } from "@/components/Providers";

function useFormAction(action, { onSuccess, resetOnSuccess = true } = {}) {
  const [state, setState] = useState({ pending: false, error: "", success: "", fieldErrors: {} });
  async function handleSubmit(event, successMessage) {
    event.preventDefault();
    const form = event.currentTarget;
    setState({ pending: true, error: "", success: "", fieldErrors: {} });
    const result = await action(new FormData(form));
    if (result?.ok) {
      if (resetOnSuccess) form.reset();
      setState({ pending: false, error: "", success: successMessage, fieldErrors: {} });
      onSuccess?.(result);
    } else {
      setState({ pending: false, error: result?.error || "", success: "", fieldErrors: result?.fieldErrors || {} });
    }
  }
  return [state, handleSubmit];
}

// Sends the "choose a new password" email to the signed-in user's address.
function EmailPasswordLink({ label, intro }) {
  const [state, setState] = useState({ pending: false, error: "", sentTo: "" });
  async function send() {
    setState({ pending: true, error: "", sentTo: "" });
    const result = await requestPasswordReset(new FormData());
    setState({ pending: false, error: result?.ok ? "" : result?.error || "Something went wrong.", sentTo: result?.ok ? result.email : "" });
  }
  if (state.sentTo) {
    return (
      <p className="field-success" role="status">
        We emailed a link to <strong>{state.sentTo}</strong>. Open it on this device to choose your password; it expires after one hour.
      </p>
    );
  }
  return (
    <div>
      {intro && <p className="text-muted" style={{ marginTop: 0 }}>{intro}</p>}
      {state.error && <p className="field-error" role="alert">{state.error}</p>}
      <button type="button" className="btn-secondary" onClick={send} disabled={state.pending}>
        {state.pending ? "Sending…" : label}
      </button>
    </div>
  );
}

export function ChangePasswordForm({ hasPassword = true, canEmailReset = false }) {
  const [state, submit] = useFormAction(changePasswordAction);
  if (!hasPassword) {
    // Google accounts can add a password, confirmed through their email.
    return (
      <details className="card-panel collapsible-panel">
        <summary>Set a password</summary>
        <EmailPasswordLink
          label="Email me a link to set a password"
          intro="You signed in with Google. To also be able to sign in with your email and a password, we'll email you a link to choose one."
        />
      </details>
    );
  }
  // Collapsed to a single "Change password" row until clicked.
  return (
    <details className="card-panel collapsible-panel">
      <summary>Change password</summary>
      <form onSubmit={(event) => submit(event, "Password updated.")}>
        <div className="field">
          <label htmlFor="currentPassword">Current password</label>
          <PasswordInput id="currentPassword" name="currentPassword" autoComplete="current-password" />
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="newPassword">New password</label>
            <PasswordInput id="newPassword" name="newPassword" autoComplete="new-password" minLength={8} />
          </div>
          <div className="field">
            <label htmlFor="confirmPassword">Repeat new password</label>
            <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" minLength={8} />
          </div>
        </div>
        {state.error && <p className="field-error" role="alert">{state.error}</p>}
        {state.success && <p className="field-success" role="status">{state.success}</p>}
        <button type="submit" className="btn-primary" disabled={state.pending}>
          {state.pending ? "Saving…" : "Update password"}
        </button>
      </form>
      {canEmailReset && (
        <div className="password-reset-alt">
          <EmailPasswordLink label="Forgot your current password? Email me a reset link" />
        </div>
      )}
    </details>
  );
}

export function StaffProfileForm({ user }) {
  const router = useRouter();
  const { refresh } = useSession();
  const [photo, setPhoto] = useState("");
  const [state, submit] = useFormAction(
    (formData) => {
      if (photo) formData.set("photo", photo);
      return updateMyProfileAction(formData);
    },
    {
      resetOnSuccess: false,
      onSuccess: () => {
        setPhoto("");
        refresh();
        router.refresh();
      },
    }
  );

  return (
    <section className="card-panel">
      <h2>Your details</h2>
      <p className="text-muted" style={{ marginTop: 0 }}>
        {user.role === "delivery"
          ? "Customers see your name, phone number and photo once you pick up their order."
          : "Your name and photo appear on the kitchen tablet when you claim orders."}
      </p>
      <form onSubmit={(event) => submit(event, "Details saved.")}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="profile-name">Full name</label>
            <input id="profile-name" name="name" defaultValue={user.name} required />
            {state.fieldErrors.name && <p className="field-error">{state.fieldErrors.name}</p>}
          </div>
          <div className="field">
            <label htmlFor="profile-phone">Phone number</label>
            <input id="profile-phone" name="phone" type="tel" defaultValue={user.phone} />
            {state.fieldErrors.phone && <p className="field-error">{state.fieldErrors.phone}</p>}
          </div>
        </div>
        <ImagePicker label="Profile photo" value={photo || user.photo} onChange={setPhoto} maxSize={480} round />
        {state.error && <p className="field-error" role="alert">{state.error}</p>}
        {state.success && <p className="field-success" role="status">{state.success}</p>}
        <button type="submit" className="btn-primary" disabled={state.pending}>
          {state.pending ? "Saving…" : "Save details"}
        </button>
      </form>
    </section>
  );
}

export function ChangePinForm() {
  const [state, submit] = useFormAction(changeMyPinAction);
  return (
    <section className="card-panel">
      <h2>Kitchen tablet PIN</h2>
      <p className="text-muted" style={{ marginTop: 0 }}>You enter this PIN on the shared kitchen tablet to claim orders.</p>
      <form onSubmit={(event) => submit(event, "PIN updated.")}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="pin">New PIN (4-6 digits)</label>
            <input id="pin" name="pin" inputMode="numeric" pattern="\d{4,6}" maxLength={6} autoComplete="off" required />
          </div>
          <div className="field">
            <label htmlFor="pin-password">Your password</label>
            <PasswordInput id="pin-password" name="currentPassword" autoComplete="current-password" />
          </div>
        </div>
        {state.error && <p className="field-error" role="alert">{state.error}</p>}
        {state.success && <p className="field-success" role="status">{state.success}</p>}
        <button type="submit" className="btn-primary" disabled={state.pending}>
          {state.pending ? "Saving…" : "Update PIN"}
        </button>
      </form>
    </section>
  );
}
