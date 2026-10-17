"use client";

import { useEffect } from "react";
import { useCart } from "@/components/Providers";

// Empties the cart once after a successful order. Runs a single time on mount:
// re-running whenever the cart context changed is what used to send the
// confirmation page into an endless render loop.
export function ClearCartOnMount() {
  const { clearCart, hydrated } = useCart();

  useEffect(() => {
    if (hydrated) clearCart();
  }, [hydrated, clearCart]);

  return null;
}

export default ClearCartOnMount;
