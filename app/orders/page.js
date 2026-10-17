import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getOrdersFor } from "@/lib/orders";
import { OrderList } from "./OrderList";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await getSession();
  if (!user) {
    redirect("/signin?next=/orders");
  }

  const orders = getOrdersFor(user.id).slice(0, 10);

  return (
    <div style={{ maxWidth: "760px", margin: "2rem auto", padding: "0 1.5rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ margin: 0 }}>Your Order History</h1>
      </div>

      <OrderList orders={orders} />
    </div>
  );
}
