"use client";

import { useEffect, useState } from "react";

// The actual theme switch happens instantly via a blocking inline script in
// app/layout.js (runs before paint, so there's no flash of the wrong
// theme). This component just reflects and toggles that state -  it reads
// the data-theme attribute the inline script already set, rather than
// deciding the theme itself.
export function ThemeToggle() {
  const [theme, setTheme] = useState(undefined);

  useEffect(() => {
    setTheme(document.documentElement.getAttribute("data-theme") || "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      window.localStorage.setItem("theme", next);
    } catch {
      // ignore write failures (private browsing, quota, etc.)
    }
    setTheme(next);
  }

  if (theme === undefined) {
    return <span className="theme-toggle theme-toggle--placeholder" aria-hidden="true" />;
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
    >
      {theme === "dark" ? (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" fill="currentColor" />
          <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <line x1="12" y1="2" x2="12" y2="4.4" />
            <line x1="12" y1="19.6" x2="12" y2="22" />
            <line x1="2" y1="12" x2="4.4" y2="12" />
            <line x1="19.6" y1="12" x2="22" y2="12" />
            <line x1="4.9" y1="4.9" x2="6.6" y2="6.6" />
            <line x1="17.4" y1="17.4" x2="19.1" y2="19.1" />
            <line x1="4.9" y1="19.1" x2="6.6" y2="17.4" />
            <line x1="17.4" y1="6.6" x2="19.1" y2="4.9" />
          </g>
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path
            d="M20 14.5a8.5 8.5 0 1 1-10.5-11 7 7 0 0 0 10.5 11z"
            fill="currentColor"
          />
        </svg>
      )}
    </button>
  );
}
