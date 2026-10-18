"use client";

import { useState } from "react";
import { createStaffAction, removeStaffAction, resetStaffPasswordAction, resetStaffPinAction } from "@/app/actions";
import { ImagePicker } from "@/components/ImagePicker";
import { Avatar, Modal, Toast } from "@/components/Modal";

const ROLE_LABELS = { staff: "Kitchen staff", delivery: "Delivery courier" };
const EMPTY_FORM = { role: "staff", name: "", email: "", phone: "", password: "", pin: "", photo: "" };

function generatePassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export function StaffManager({ initialStaff }) {
  const [staff, setStaff] = useState(initialStaff);
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(initialStaff.length === 0);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);
  const [resetting, setResetting] = useState(null); // { member, kind: "password" | "pin" }
  const [toast, setToast] = useState(null);

  const update = (key) => (event) => setForm((previous) => ({ ...previous, [key]: event.target.value }));
  const visible = staff.filter((member) => filter === "all" || member.role === filter);

  async function handleCreate(event) {
    event.preventDefault();
    setSaving(true);
    setFieldErrors({});
    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => formData.set(key, value));
    const result = await createStaffAction(formData);
    setSaving(false);
    if (!result?.ok) {
      setFieldErrors(result?.fieldErrors || { form: result?.error || "Could not create the account." });
      return;
    }
    setStaff((previous) => [...previous, { ...result.staff, stats: { today: 0, allTime: 0 } }].sort((a, b) => a.name.localeCompare(b.name)));
    setCreated({ ...result.staff, password: form.password, pin: form.role === "staff" ? form.pin : "" });
    setForm({ ...EMPTY_FORM, role: form.role });
    setShowForm(false);
  }

  async function handleRemove(member) {
    if (!confirm(`Remove ${member.name}? They will be signed out and can no longer use the ${member.role === "staff" ? "kitchen" : "delivery"} board. Past orders keep their name.`)) return;
    const result = await removeStaffAction(member.id);
    if (result?.ok) {
      setStaff((previous) => previous.filter((m) => m.id !== member.id));
      setToast({ tone: "success", message: `${member.name} was removed.` });
    } else {
      setToast({ tone: "error", message: result?.error || "Could not remove this account." });
    }
  }

  return (
    <div>
      <div className="board__toolbar">
        <div className="segmented" role="group" aria-label="Filter staff">
          {[["all", "Everyone"], ["staff", "Kitchen"], ["delivery", "Delivery"]].map(([key, label]) => (
            <button key={key} type="button" className={filter === key ? "is-active" : ""} onClick={() => setFilter(key)}>
              {label} ({key === "all" ? staff.length : staff.filter((m) => m.role === key).length})
            </button>
          ))}
        </div>
        <button type="button" className="btn-primary" onClick={() => setShowForm((on) => !on)}>
          {showForm ? "Close form" : "+ Register staff member"}
        </button>
      </div>

      {showForm && (
        <form className="card-panel" onSubmit={handleCreate} style={{ marginBottom: "1.5rem" }} noValidate>
          <h2>Register a staff member</h2>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="staff-role">Role *</label>
              <select id="staff-role" value={form.role} onChange={update("role")}>
                <option value="staff">Kitchen staff</option>
                <option value="delivery">Delivery courier</option>
              </select>
              {fieldErrors.role && <p className="field-error">{fieldErrors.role}</p>}
            </div>
            <div className="field">
              <label htmlFor="staff-name">Full name *</label>
              <input id="staff-name" value={form.name} onChange={update("name")} autoComplete="off" required />
              {fieldErrors.name && <p className="field-error">{fieldErrors.name}</p>}
            </div>
            <div className="field">
              <label htmlFor="staff-email">Email (used to sign in) *</label>
              <input id="staff-email" type="email" value={form.email} onChange={update("email")} autoComplete="off" required />
              {fieldErrors.email && <p className="field-error">{fieldErrors.email}</p>}
            </div>
            <div className="field">
              <label htmlFor="staff-phone">Phone number *</label>
              <input id="staff-phone" type="tel" inputMode="tel" placeholder="0912345678" value={form.phone} onChange={update("phone")} autoComplete="off" required />
              {fieldErrors.phone && <p className="field-error">{fieldErrors.phone}</p>}
            </div>
            <div className="field">
              <label htmlFor="staff-password">Temporary password *</label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input id="staff-password" type="text" value={form.password} onChange={update("password")} autoComplete="new-password" required style={{ flex: 1 }} />
                <button type="button" className="btn-ghost" onClick={() => setForm((f) => ({ ...f, password: generatePassword() }))}>
                  Generate
                </button>
              </div>
              {fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}
            </div>
            {form.role === "staff" && (
              <div className="field">
                <label htmlFor="staff-pin">Kitchen tablet PIN (4-6 digits) *</label>
                <input
                  id="staff-pin"
                  inputMode="numeric"
                  maxLength={6}
                  value={form.pin}
                  onChange={(event) => setForm((f) => ({ ...f, pin: event.target.value.replace(/\D/g, "") }))}
                  autoComplete="off"
                  required
                />
                {fieldErrors.pin && <p className="field-error">{fieldErrors.pin}</p>}
              </div>
            )}
          </div>
          <ImagePicker
            label={form.role === "delivery" ? "Profile photo (shown to customers)" : "Profile photo"}
            value={form.photo}
            onChange={(photo) => setForm((f) => ({ ...f, photo }))}
            maxSize={480}
            round
            required={form.role === "delivery"}
          />
          {fieldErrors.photo && <p className="field-error">{fieldErrors.photo}</p>}
          {fieldErrors.form && <p className="field-error">{fieldErrors.form}</p>}
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Creating…" : "Create account"}
          </button>
        </form>
      )}

      {visible.length === 0 ? (
        <p className="board-empty">No staff registered yet. Use “Register staff member” to add your kitchen team and couriers.</p>
      ) : (
        <div className="staff-list">
          {visible.map((member) => (
            <article key={member.id} className="card-panel staff-card">
              <div className="staff-card__top">
                <Avatar name={member.name} photo={member.photo} size={56} />
                <div className="staff-card__info">
                  <strong>{member.name}</strong>
                  <span>{ROLE_LABELS[member.role]}</span>
                  <span>{member.email}</span>
                  {member.phone && <span>{member.phone}</span>}
                </div>
              </div>
              <p className="ticket__meta">
                {member.role === "staff" ? "Orders cooked" : "Deliveries"}: <strong>{member.stats.today}</strong> today ·{" "}
                <strong>{member.stats.allTime}</strong> total
                {member.role === "staff" && !member.hasPin && <span className="field-error"> · No PIN set</span>}
              </p>
              <div className="staff-card__actions">
                <button type="button" className="btn-secondary" onClick={() => setResetting({ member, kind: "password" })}>
                  Reset password
                </button>
                {member.role === "staff" && (
                  <button type="button" className="btn-secondary" onClick={() => setResetting({ member, kind: "pin" })}>
                    {member.hasPin ? "Reset PIN" : "Set PIN"}
                  </button>
                )}
                <button type="button" className="btn-danger" onClick={() => handleRemove(member)}>
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {created && (
        <Modal title="Account created" onClose={() => setCreated(null)}>
          <p>Share these sign-in details with {created.name}. They can change the password from their profile.</p>
          <div className="board__hint">
            <div>Sign in at: <strong>/staff/signin</strong></div>
            <div>Email: <strong>{created.email}</strong></div>
            <div>Temporary password: <strong>{created.password}</strong></div>
            {created.pin && <div>Kitchen tablet PIN: <strong>{created.pin}</strong></div>}
          </div>
          <button type="button" className="btn-primary" onClick={() => setCreated(null)}>
            Done
          </button>
        </Modal>
      )}

      {resetting && (
        <ResetDialog
          member={resetting.member}
          kind={resetting.kind}
          onClose={() => setResetting(null)}
          onDone={(message) => {
            if (resetting.kind === "pin") {
              setStaff((previous) => previous.map((m) => (m.id === resetting.member.id ? { ...m, hasPin: true } : m)));
            }
            setResetting(null);
            setToast({ tone: "success", message });
          }}
        />
      )}

      <Toast message={toast?.message} tone={toast?.tone} onDone={() => setToast(null)} />
    </div>
  );
}

function ResetDialog({ member, kind, onClose, onDone }) {
  const [value, setValue] = useState(kind === "password" ? generatePassword() : "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const result = kind === "password"
      ? await resetStaffPasswordAction(member.id, value)
      : await resetStaffPinAction(member.id, value);
    setSaving(false);
    if (!result?.ok) {
      setError(result?.error || "Could not save.");
      return;
    }
    onDone(
      kind === "password"
        ? `New password for ${member.name}: ${value} (they have been signed out everywhere).`
        : `${member.name}'s PIN was updated.`
    );
  }

  return (
    <Modal title={kind === "password" ? `Reset password for ${member.name}` : `Set PIN for ${member.name}`} onClose={onClose}>
      <form onSubmit={submit}>
        {kind === "password" ? (
          <div className="field">
            <label htmlFor="reset-value">New password</label>
            <input
              id="reset-value"
              type="text"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              autoComplete="new-password"
            />
            <p className="ticket__meta">
              A strong password has been generated. Edit it if you like, then share it with {member.name}.
            </p>
          </div>
        ) : (
          <div className="field">
            <label htmlFor="reset-value">New PIN (4-6 digits)</label>
            <input
              id="reset-value"
              inputMode="numeric"
              maxLength={6}
              value={value}
              onChange={(event) => setValue(event.target.value.replace(/\D/g, ""))}
              autoFocus
            />
          </div>
        )}
        {error && <p className="field-error">{error}</p>}
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
      </form>
    </Modal>
  );
}
