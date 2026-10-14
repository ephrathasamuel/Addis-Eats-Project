import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSession } from "@/lib/session";
import { getOrdersFor, getRecentOrdersFromCookies } from "@/lib/orders";
import { OrderList } from "./OrderList";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await getSession();
  if (!user) {
    redirect("/signin?next=/orders");
  }

  const cookieStore = await cookies();
  getRecentOrdersFromCookies(cookieStore);

  const orders = getOrdersFor(user.id).slice(0, 10);

  return (
    <main style={{ maxWidth: "760px", margin: "2rem auto", padding: "0 1.5rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ margin: 0 }}>Your Order History</h1>
      </div>

      <OrderList orders={orders} />
    </main>
  );
}
