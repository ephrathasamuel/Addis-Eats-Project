"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AuthStatus() {
  const pathname = usePathname();
  const [auth, setAuth] = useState(undefined); // { authenticated, user }

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data?.authenticated && data?.user) {
          setAuth({ authenticated: true, user: data.user });
        } else {
          // Clear any lingering client cookies
          document.cookie = "user_name=; path=/; max-age=0;";
          document.cookie = "user_role=; path=/; max-age=0;";
          setAuth({ authenticated: false, user: null });
        }
      })
      .catch(() => {
        if (active) setAuth({ authenticated: false, user: null });
      });

    return () => {
      active = false;
    };
  }, [pathname]);

  if (auth === undefined) {
    return <span className="auth-status auth-status--placeholder" aria-hidden="true" />;
  }

  if (!auth.authenticated || !auth.user) {
    return (
      <Link href="/signin" className="btn-ghost">
        Sign in
      </Link>
    );
  }

  const user = auth.user;
  let rawName = user.name || "User";
  try {
    rawName = decodeURIComponent(rawName);
  } catch {
    // leave as is
  }
  const firstName = rawName.split(" ")[0];

  return (
    <Link
      href="/profile"
      className="btn-ghost"
      style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
    >
      <span>Hi, {firstName}</span>
      {user.role === "staff" && (
        <span
          style={{
            fontSize: "0.68rem",
            background: "#2e7d32",
            color: "white",
            padding: "0.1rem 0.45rem",
            borderRadius: "999px",
            fontWeight: "750",
            letterSpacing: "0.03em",
            textTransform: "uppercase",
          }}
        >
          Staff
        </span>
      )}
      {user.role === "admin" && (
        <span
          style={{
            fontSize: "0.68rem",
            background: "var(--brand)",
            color: "white",
            padding: "0.1rem 0.45rem",
            borderRadius: "999px",
            fontWeight: "750",
            letterSpacing: "0.03em",
            textTransform: "uppercase",
          }}
        >
          Admin
        </span>
      )}
    </Link>
  );
}

export default AuthStatus;
