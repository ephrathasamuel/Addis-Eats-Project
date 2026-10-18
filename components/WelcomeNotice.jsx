"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/components/Providers";

// Shown once after a brand-new account signs in for the first time (set by
// app/auth/callback as the short-lived "addis_welcome" cookie).
export function WelcomeNotice() {
  const { user } = useSession();
  const [method, setMethod] = useState(null);

  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)addis_welcome=([^;]+)/);
    if (!match) return;
    setMethod(match[1]);
    document.cookie = "addis_welcome=; path=/; max-age=0";
  }, []);

  if (!method || !user) return null;
  const firstName = (user.name || "").split(" ")[0];

  return (
    <div className="welcome-notice" role="status">
      <div>
        <strong>Welcome to Addis Eats{firstName ? `, ${firstName}` : ""}!</strong>
        <span>
          {method === "google"
            ? " Your new account was created with your Google account. You're signed in and ready to order."
            : " Your email is confirmed and your account is ready. You're signed in."}
        </span>
      </div>
      <button type="button" className="btn-ghost" onClick={() => setMethod(null)} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
