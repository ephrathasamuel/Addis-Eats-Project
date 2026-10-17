import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getDeliveryOrdersFor } from "@/lib/orders";
import { DeliveryBoard } from "./DeliveryBoard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Delivery",
  robots: { index: false },
};

export default async function DeliveryPage() {
  const user = await getSession();

  if (!user) {
    redirect("/signin?next=/delivery");
  }

  if (user.role !== "delivery" && user.role !== "admin") {
    return (
      <div className="empty-state" style={{ maxWidth: "620px", margin: "4rem auto" }}>
        <h1>Couriers only</h1>
        <p>
          The delivery board is for Addis Eats couriers. You are signed in as <strong>{user.name}</strong>.
        </p>
        <Link href="/menu" className="btn-secondary">
          Back to the menu
        </Link>
      </div>
    );
  }

  return (
    <div className="page-wide">
      <div className="page-heading">
        <div>
          <h1>{user.role === "admin" ? "Delivery overview" : "Delivery board"}</h1>
          <p>
            {user.role === "admin"
              ? "Live view of the pickup pool and every courier on the road."
              : "Accept ready orders, deliver them, and mark them delivered. The list updates automatically."}
          </p>
        </div>
        <span className={`role-pill role-pill--${user.role}`}>{user.role === "admin" ? "Admin view" : user.name}</span>
      </div>
      <DeliveryBoard
        initialOrders={getDeliveryOrdersFor(user.id, user.role === "admin")}
        user={{ id: user.id, name: user.name, role: user.role }}
      />
    </div>
  );
}
