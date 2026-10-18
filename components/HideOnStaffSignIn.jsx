"use client";

import { usePathname } from "next/navigation";

// Keeps the staff sign-in page to just the logo and the form.
export function HideOnStaffSignIn({ children }) {
  return usePathname() === "/staff/signin" ? null : children;
}
