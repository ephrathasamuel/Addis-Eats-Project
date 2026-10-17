import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getAllDishesAdmin } from "@/lib/dishes";
import { getAllOrders, getDishPopularityByLocation, toOrderClientData } from "@/lib/orders";
import { getFinancialLedger } from "@/lib/finances";
import { AdminDashboard } from "./AdminDashboard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin",
  robots: { index: false },
};

export default async function AdminPage() {
  const user = await getSession();

  if (!user) redirect("/signin?next=/admin");
  if (user.role === "delivery") redirect("/delivery");
  if (user.role === "staff") redirect("/kitchen");
  // Customers are quietly sent to the menu; the admin area is never linked for them.
  if (user.role !== "admin") redirect("/menu");

  const orders = getAllOrders();

  return (
    <div className="page-wide">
      <AdminDashboard
        initialDishes={getAllDishesAdmin()}
        initialOrders={orders.map(toOrderClientData)}
        ledgerData={getFinancialLedger(orders)}
        rankedFavorites={getDishPopularityByLocation()}
        mustChangePassword={Boolean(user.mustChangePassword)}
      />
    </div>
  );
}
