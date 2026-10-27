"use client";

import Link from "next/link";
import { useSession } from "@/components/Providers";
import { Avatar } from "@/components/Modal";
import { Tr } from "@/components/Tr";

const ROLE_BADGES = {
  staff: { label: "Kitchen", background: "#2e7d32" },
  admin: { label: "Admin", background: "var(--brand)", color: "var(--on-brand)" },
  delivery: { label: "Courier", background: "#2563eb" },
};

// The account button in the header: "Hi, name" with a round photo on wider
// screens; on phones only the round photo (or initials), so a long name can't
// push the header wider than the screen.
export function AuthStatus() {
  const { status, user } = useSession();

  if (status === "loading") {
    return <span className="auth-status auth-status--placeholder" aria-hidden="true" />;
  }

  if (!user) {
    return (
      <Link href="/signin" className="btn-ghost">
        <Tr text="Sign in" />
      </Link>
    );
  }

  const firstName = (user.name || "User").split(" ")[0];
  const badge = ROLE_BADGES[user.role];

  return (
    <Link href="/profile" className="btn-ghost auth-chip" aria-label={`Your profile (${user.name || "User"})`} title={user.name || ""}>
      <Avatar name={user.name || "User"} photo={user.photo} size={26} />
      <span className="auth-chip__name">Hi, {firstName}</span>
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
