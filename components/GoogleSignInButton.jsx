"use client";

import { useState } from "react";
import { signInWithGoogle } from "@/app/actions";

export default function GoogleSignInButton({ next, role = "customer", isSupabaseConfigured }) {
  const [showChooser, setShowChooser] = useState(false);
  const [useCustom, setUseCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customEmail, setCustomEmail] = useState("");

  const accounts = [
    {
      name: "Ephratha Samuel",
      email: "sephratha@gmail.com",
      avatarColor: "#4285F4",
      initial: "E",
    },
    {
      name: role === "admin"
        ? "Admin Google Account"
        : role === "staff"
        ? "Kitchen Staff Google"
        : role === "delivery"
        ? "Courier Google Account"
        : "Addis Eats Customer",
      email: role === "admin"
        ? "admin.addiseats@gmail.com"
        : role === "staff"
        ? "kitchen.addiseats@gmail.com"
        : role === "delivery"
        ? "courier.addiseats@gmail.com"
        : "customer.addiseats@gmail.com",
      avatarColor: "#34A853",
      initial: role === "admin" ? "A" : role === "staff" ? "K" : role === "delivery" ? "C" : "U",
    },
  ];

  const handleOpen = (e) => {
    // If Supabase is active with live OAuth credentials, let the native form submit redirect to Google
    if (isSupabaseConfigured) {
      return;
    }
    // Otherwise open the Google Account Chooser
    e.preventDefault();
    setShowChooser(true);
  };

  return (
    <>
      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={next || "/orders"} />
        <input type="hidden" name="role" value={role || "customer"} />
        <button
          type={isSupabaseConfigured ? "submit" : "button"}
          onClick={handleOpen}
          className="btn-secondary btn-block"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.6rem",
            width: "100%",
            padding: "0.65rem 1rem",
            borderRadius: "12px",
            fontSize: "0.92rem",
            fontWeight: "600",
            backgroundColor: "var(--card-bg)",
            border: "1px solid var(--border)",
            cursor: "pointer",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>
      </form>

      {/* Google Account Chooser Modal */}
      {showChooser && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "rgba(0, 0, 0, 0.55)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
          onClick={() => setShowChooser(false)}
        >
          <div
            style={{
              backgroundColor: "var(--card-bg)",
              color: "var(--text)",
              width: "100%",
              maxWidth: "400px",
              borderRadius: "20px",
              border: "1px solid var(--border)",
              boxShadow: "0 16px 40px rgba(0,0,0,0.22)",
              padding: "1.75rem",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Google Header */}
            <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" style={{ marginBottom: "0.5rem" }} aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <h2 style={{ fontSize: "1.2rem", margin: "0 0 0.25rem", fontWeight: "700" }}>
                Choose an account
              </h2>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted)" }}>
                to continue to Addis Eats{role && role !== "customer" ? ` (${role.toUpperCase()})` : ""}
              </p>
            </div>

            {/* Account List */}
            {!useCustom ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {accounts.map((acc) => (
                  <form key={acc.email} action={signInWithGoogle}>
                    <input type="hidden" name="next" value={next || "/orders"} />
                    <input type="hidden" name="role" value={role || "customer"} />
                    <input type="hidden" name="googleName" value={acc.name} />
                    <input type="hidden" name="googleEmail" value={acc.email} />
                    <button
                      type="submit"
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.7rem 0.85rem",
                        borderRadius: "12px",
                        border: "1px solid var(--border)",
                        background: "var(--bg)",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "background 0.15s ease",
                      }}
                    >
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          background: acc.avatarColor,
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "700",
                          fontSize: "0.95rem",
                          flexShrink: 0,
                        }}
                      >
                        {acc.initial}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: "650", fontSize: "0.9rem", color: "var(--text)" }}>
                          {acc.name}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {acc.email}
                        </div>
                      </div>
                    </button>
                  </form>
                ))}

                <button
                  type="button"
                  onClick={() => setUseCustom(true)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.7rem 0.85rem",
                    borderRadius: "12px",
                    border: "1px dashed var(--border)",
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    color: "var(--brand)",
                    fontSize: "0.86rem",
                    fontWeight: "600",
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                  <span>Use another Google account</span>
                </button>
              </div>
            ) : (
              /* Custom Google Account Form */
              <form action={signInWithGoogle} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <input type="hidden" name="next" value={next || "/orders"} />
                <input type="hidden" name="role" value={role || "customer"} />

                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor="customGoogleName" style={{ fontSize: "0.82rem" }}>Full Name</label>
                  <input
                    id="customGoogleName"
                    name="googleName"
                    type="text"
                    required
                    placeholder="Your Google Account Name"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    style={{ fontSize: "0.9rem" }}
                  />
                </div>

                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor="customGoogleEmail" style={{ fontSize: "0.82rem" }}>Google / Gmail Address</label>
                  <input
                    id="customGoogleEmail"
                    name="googleEmail"
                    type="email"
                    required
                    placeholder="example@gmail.com"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    style={{ fontSize: "0.9rem" }}
                  />
                </div>

                <button type="submit" className="btn-primary" style={{ marginTop: "0.5rem" }}>
                  Sign in with this Google Account
                </button>

                <button
                  type="button"
                  onClick={() => setUseCustom(false)}
                  className="btn-ghost"
                  style={{ fontSize: "0.82rem", textAlign: "center" }}
                >
                  Back to suggested accounts
                </button>
              </form>
            )}

            {/* Cancel Button */}
            <div style={{ marginTop: "1rem", textAlign: "center" }}>
              <button
                type="button"
                onClick={() => setShowChooser(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "0.82rem",
                  color: "var(--muted)",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
