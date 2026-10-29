"use client";

import { usePathname } from "next/navigation";
import { useSession } from "@/components/Providers";

// Keeps the staff sign-in page (and the kitchen tablet's sign-in screen) to
// just the logo and the form.
export function HideOnStaffSignIn({ children }) {
  const pathname = usePathname();
  const { user } = useSession();
  const tabletSignIn = pathname === "/kitchen/tablet" && user?.role !== "kitchen-tablet";
  return pathname === "/staff/signin" || tabletSignIn ? null : children;
}
