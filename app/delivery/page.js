import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getAllOrders } from "@/lib/orders";
import { DeliveryBoard } from "./DeliveryBoard";

export const dynamic = "force-dynamic";

export default async function DeliveryPage() {
  const user = await getSession();

  // If user is not authenticated, redirect to sign in with next=/delivery
  if (!user) {
    redirect("/signin?next=/delivery");
  }

  const allOrders = getAllOrders();

  return (
    <main style={{ maxWidth: "1100px", margin: "2rem auto", padding: "0 1.5rem 4rem" }}>
      <DeliveryBoard initialOrders={allOrders} user={user} />
    </main>
  );
}
