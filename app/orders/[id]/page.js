import { getOrderForUser, toOrderClientData } from "@/lib/orders";
import { getSession } from "@/lib/session";
import { notFound, redirect } from "next/navigation";
import { OrderStatus } from "./OrderStatus";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params }) {
  const { id } = await params;
  const user = await getSession();
  if (!user) redirect(`/signin?next=${encodeURIComponent(`/orders/${id}`)}`);

  const initial = getOrderForUser(id, user.id, user.role === "admin" ? "admin" : "customer");
  if (!initial) notFound();

  return (
    <div>
      <OrderStatus id={id} initial={toOrderClientData(initial)} />
    </div>
  );
}
