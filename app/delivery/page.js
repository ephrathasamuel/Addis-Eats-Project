import { redirect } from "next/navigation";
import Link from "next/link";
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

  if (user.role !== "delivery" && user.role !== "admin") {
    return (
      <main style={{ maxWidth: "620px", margin: "4rem auto", textAlign: "center", padding: "0 1.5rem" }}>
        <h1>403 Forbidden</h1>
        <p style={{ color: "var(--muted)", margin: "1rem 0 1.5rem", lineHeight: 1.6 }}>
          Access to the delivery dispatch portal is restricted to courier drivers and administrators. You are currently signed in as <strong>{user.name}</strong> (<code>{user.role}</code> role).
        </p>
        <div style={{ display: "flex", gap: "0.85rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/signin?next=/delivery&email=delivery%40addiseats.com&name=Abebe+Courier"
            className="btn-primary"
          >
            Switch to Courier Account
          </Link>
          <Link href="/" className="btn-secondary">
            Return Home
          </Link>
        </div>
      </main>
    );
  }

  const allOrders = getAllOrders();

  return (
    <main style={{ maxWidth: "1100px", margin: "2rem auto", padding: "0 1.5rem 4rem" }}>
      <DeliveryBoard initialOrders={allOrders} user={user} />
    </main>
  );
}
