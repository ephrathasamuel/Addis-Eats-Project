import { getDashboardMetrics } from "@/lib/orders";
import { RevenueChart } from "./RevenueChart";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Analytics Dashboard",
  description: "Addis Eats business intelligence dashboard: revenue by neighbourhood, order volume trends, and transaction tables.",
};

export default async function DashboardPage() {
  const user = await getSession();
  if (!user) redirect("/signin?next=/dashboard");
  if (user.role !== "admin") redirect("/");

  // Aggregate server-side so only compact summary data crosses the boundary
  const {
    revenueByNeighbourhood,
    ordersOverTime,
    totalRevenue,
    totalOrders,
    averageOrderValue,
  } = getDashboardMetrics();

  return (
    <div style={{ maxWidth: "1040px", margin: "2rem auto", padding: "0 1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ margin: "0 0 0.25rem" }}>Business Intelligence Dashboard</h1>
          <p style={{ margin: 0, color: "var(--muted)" }}>
            Aggregated metrics across Addis Ababa delivery zones.
          </p>
        </div>
        <Link href="/orders" className="btn-primary" style={{ fontSize: "0.9rem" }}>
          View Order Records →
        </Link>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1.25rem",
          marginBottom: "2.5rem",
        }}
      >
        <div
          style={{
            background: "var(--card-bg)",
            borderRadius: "20px",
            padding: "1.5rem",
            border: "1px solid var(--border)",
            boxShadow: "0 2px 8px var(--shadow-color)",
          }}
        >
          <div style={{ fontSize: "0.85rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Total Revenue
          </div>
          <div style={{ fontSize: "1.85rem", fontWeight: "800", color: "var(--brand-dark)", marginTop: "0.4rem" }}>
            {totalRevenue.toLocaleString()} ETB
          </div>
        </div>

        <div
          style={{
            background: "var(--card-bg)",
            borderRadius: "20px",
            padding: "1.5rem",
            border: "1px solid var(--border)",
            boxShadow: "0 2px 8px var(--shadow-color)",
          }}
        >
          <div style={{ fontSize: "0.85rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Total Orders
          </div>
          <div style={{ fontSize: "1.85rem", fontWeight: "800", color: "var(--text)", marginTop: "0.4rem" }}>
            {totalOrders}
          </div>
        </div>

        <div
          style={{
            background: "var(--card-bg)",
            borderRadius: "20px",
            padding: "1.5rem",
            border: "1px solid var(--border)",
            boxShadow: "0 2px 8px var(--shadow-color)",
          }}
        >
          <div style={{ fontSize: "0.85rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Average Order Value
          </div>
          <div style={{ fontSize: "1.85rem", fontWeight: "800", color: "var(--text)", marginTop: "0.4rem" }}>
            {averageOrderValue} ETB
          </div>
        </div>
      </div>

      {/* Charts and Data Representations */}
      <RevenueChart
        revenueByNeighbourhood={revenueByNeighbourhood}
        ordersOverTime={ordersOverTime}
      />
    </div>
  );
}
