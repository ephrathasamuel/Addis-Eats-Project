import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getAllDishesAdmin, getAdminFavorites } from "@/lib/dishes";
import { getAllOrders } from "@/lib/orders";
import { AdminDashboard } from "./AdminDashboard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Panel : Menu Inventory & Performance Favorites",
  description: "Addis Eats restaurant administrator dashboard. Manage dish availability, mark sold out, and view top-ordered items.",
};

export default async function AdminPage() {
  const user = await getSession();

  if (!user) {
    redirect("/signin?next=/admin&admin=true");
  }

  if (user.role === "delivery") {
    redirect("/delivery");
  }

  if (user.role !== "staff" && user.role !== "admin") {
    return (
      <main style={{ maxWidth: "620px", margin: "4rem auto", textAlign: "center", padding: "0 1.5rem" }}>
        <h1>403 Forbidden</h1>
        <p style={{ color: "var(--muted)", margin: "1rem 0 1.5rem", lineHeight: 1.6 }}>
          Access to the restaurant admin panel is restricted to staff and administrators. You are currently signed in as <strong>{user.name}</strong> (<code>{user.role}</code> role).
        </p>
        <div style={{ display: "flex", gap: "0.85rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/signin?next=/admin&admin=true&email=staff%40addiseats.com&name=Chef+Kassahun"
            className="btn-primary"
          >
            Switch to Staff Account
          </Link>
          <Link href="/" className="btn-secondary">
            Return to Menu
          </Link>
        </div>
      </main>
    );
  }

  const dishes = getAllDishesAdmin();
  const favorites = getAdminFavorites();
  const orders = getAllOrders();

  return (
    <main style={{ maxWidth: "1120px", margin: "2rem auto", padding: "0 1.5rem" }}>
      <AdminDashboard
        initialDishes={dishes}
        favorites={favorites}
        initialOrders={orders}
        user={user}
      />
    </main>
  );
}
