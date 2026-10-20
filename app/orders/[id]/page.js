import { getOrderForUser, toOrderClientData } from "@/lib/orders";
import { getSession } from "@/lib/session";
import { notFound, redirect } from "next/navigation";
import { OrderStatus } from "./OrderStatus";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params, searchParams }) {
  const { id } = await params;
  // The back button returns to wherever the order was opened from.
  const fromProfile = (await searchParams)?.from === "profile";
  const user = await getSession();
  if (!user) redirect(`/signin?next=${encodeURIComponent(`/orders/${id}`)}`);

  const initial = getOrderForUser(id, user.id, user.role === "admin" ? "admin" : "customer");
  if (!initial) notFound();

  return (
    <div>
      <OrderStatus
        id={id}
        initial={toOrderClientData(initial)}
        back={fromProfile ? { href: "/profile", label: "Back to profile" } : { href: "/orders", label: "Back to order history" }}
      />
    </div>
  );
}
