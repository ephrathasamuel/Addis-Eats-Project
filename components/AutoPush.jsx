"use client";

import { useEffect } from "react";
import { useSession } from "@/components/Providers";
import { askOnce, keepSubscribed } from "@/lib/push-client";

// Notifications without hunting for a button:
// - any signed-in device that already allowed notifications is kept subscribed;
// - kitchen staff, the kitchen tablet and couriers are asked on their first tap
//   (customers are asked when they tap "Place order", in the checkout form).
const STAFF_ROLES = ["staff", "delivery", "kitchen-tablet"];

export function AutoPush() {
  const { user } = useSession();
  const role = user?.role;

  useEffect(() => {
    if (!role) return undefined;
    keepSubscribed();
    if (!STAFF_ROLES.includes(role)) return undefined;
    const onFirstTap = () => askOnce();
    window.addEventListener("pointerdown", onFirstTap, { once: true });
    return () => window.removeEventListener("pointerdown", onFirstTap);
  }, [role]);

  return null;
}
