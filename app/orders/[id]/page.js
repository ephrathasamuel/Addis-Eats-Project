import { getOrderForUser, getOrderFromCookies } from "@/lib/orders";
import { getSession } from "@/lib/session";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { OrderStatus } from "./OrderStatus";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params }) {
  const { id } = await params;
  const user = await getSession();
  if (!user) redirect(`/signin?next=${encodeURIComponent(`/orders/${id}`)}`);

  const cookieStore = await cookies();
  getOrderFromCookies(id, cookieStore);

  const initial = getOrderForUser(id, user.id, user.role);
  if (!initial) notFound();

  return (
    <main style={{ padding: "2rem 1.5rem 4rem" }}>
      <OrderStatus id={id} initial={initial} />
    </main>
  );
}
