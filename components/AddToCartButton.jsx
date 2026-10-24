"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useCart, useSession } from "@/components/Providers";
import { Tr } from "@/components/Tr";
import { setDishSoldOutAction } from "@/app/actions";

// Customers (and signed-out visitors) get "Add to cart". Kitchen staff and
// admins get a sold-out toggle instead; couriers only browse the menu.
export function AddToCartButton({ dish, size = "default" }) {
  const { user } = useSession();
  const role = user?.role;

  if (role === "staff" || role === "admin") {
    return <SoldOutToggle dish={dish} size={size} />;
  }
  if (role === "delivery") {
    return dish?.isSoldOut ? <SoldOutLabel size={size} /> : null;
  }
  return <CustomerAddButton dish={dish} size={size} />;
}

function SoldOutLabel({ size }) {
  return (
    <button
      type="button"
      disabled
      className={`add-to-cart add-to-cart--sold-out ${size === "compact" ? "add-to-cart--compact" : ""}`}
      style={{
        opacity: 0.6,
        cursor: "not-allowed",
        background: "var(--border)",
        color: "var(--muted)",
        borderColor: "transparent",
      }}
      title="This dish is currently sold out."
    >
      <Tr text="Sold out" />
    </button>
  );
}

function CustomerAddButton({ dish, size }) {
  const { addItem } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  if (dish?.isSoldOut) return <SoldOutLabel size={size} />;

  function handleClick(e) {
    // DishCard wraps this in a Link (photo/title go to the dish page) -
    // stop the click from also triggering that navigation.
    e.preventDefault();
    e.stopPropagation();
    addItem(dish);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  }

  return (
    <button
      type="button"
      className={`add-to-cart ${size === "compact" ? "add-to-cart--compact" : ""}`}
      onClick={handleClick}
    >
      <Tr text={justAdded ? "Added" : "Add to cart"} />
    </button>
  );
}

function SoldOutToggle({ dish, size }) {
  const router = useRouter();
  const [soldOut, setSoldOut] = useState(Boolean(dish?.isSoldOut));
  const [pending, startTransition] = useTransition();

  function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const next = !soldOut;
    setSoldOut(next);
    startTransition(async () => {
      const result = await setDishSoldOutAction(dish.id, next);
      if (!result?.ok) {
        setSoldOut(!next);
        alert(result?.error || "Could not update availability.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-pressed={soldOut}
      className={`add-to-cart ${size === "compact" ? "add-to-cart--compact" : ""}`}
      style={
        soldOut
          ? { background: "#16a34a", borderColor: "#16a34a", color: "#fff" }
          : { background: "#dc2626", borderColor: "#dc2626", color: "#fff" }
      }
      title={soldOut ? "Put this dish back on the menu" : "Mark this dish as sold out"}
    >
      {pending ? "Saving…" : soldOut ? "Mark available" : "Mark sold out"}
    </button>
  );
}
