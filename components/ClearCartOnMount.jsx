"use client";

import { useEffect } from "react";
import { useCart } from "@/components/Providers";

export function ClearCartOnMount() {
  const { clearCart } = useCart();

  useEffect(() => {
    try {
      if (typeof clearCart === "function") {
        clearCart();
      }
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("addis_cart");
        window.localStorage.removeItem("addis-cart");
      }
    } catch {}
  }, [clearCart]);

  return null;
}

export default ClearCartOnMount;
