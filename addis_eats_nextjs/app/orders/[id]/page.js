import { getOrder, getOrderFromCookies } from "@/lib/orders";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { OrderStatus } from "./OrderStatus";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params }) {
  const { id } = await params;
  let initial = getOrder(id);

  if (!initial && id) {
    const cookieStore = await cookies();
    initial = getOrderFromCookies(id, cookieStore);
  }

  if (!initial) {
    notFound();
  }

  return (
    <main style={{ padding: "2rem 1.5rem 4rem" }}>
      <OrderStatus id={id} initial={initial} />
    </main>
  );
}
