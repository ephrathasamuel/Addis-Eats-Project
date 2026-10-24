"use client";

import Link from "next/link";
import { useSession } from "@/components/Providers";

const ROLE_BADGES = {
  staff: { label: "Kitchen", background: "#2e7d32" },
  admin: { label: "Admin", background: "var(--brand)", color: "var(--on-brand)" },
  delivery: { label: "Courier", background: "#2563eb" },
};

export function AuthStatus() {
  const { status, user } = useSession();

  if (status === "loading") {
    return <span className="auth-status auth-status--placeholder" aria-hidden="true" />;
  }

  if (!user) {
    return (
      <Link href="/signin" className="btn-ghost">
        Sign in
      </Link>
    );
  }

  const firstName = (user.name || "User").split(" ")[0];
  const badge = ROLE_BADGES[user.role];

  return (
    <Link
      href="/profile"
      className="btn-ghost"
      style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
    >
      {user.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.photo} alt="" width={22} height={22} style={{ borderRadius: "50%", objectFit: "cover" }} />
      ) : null}
      <span>Hi, {firstName}</span>
      {badge && (
        <span
          className="auth-role-badge"
          style={{
            fontSize: "0.68rem",
            background: badge.background,
            color: badge.color || "white",
            padding: "0.1rem 0.45rem",
            borderRadius: "999px",
            fontWeight: "750",
            letterSpacing: "0.03em",
            textTransform: "uppercase",
          }}
        >
          {badge.label}
        </span>
      )}
    </Link>
  );
}

export default AuthStatus;
