import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getAllOrders } from "@/lib/orders";
import { getFinancialLedger } from "@/lib/finances";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminFinancesPage() {
  const user = await getSession();

  if (!user || (user.role !== "admin" && user.role !== "staff")) {
    redirect("/signin?next=/admin/finances");
  }

  const allOrders = getAllOrders();
  const { ledger, totals } = getFinancialLedger(allOrders);

  return (
    <main style={{ maxWidth: "1140px", margin: "2rem auto", padding: "0 1.5rem 5rem" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.3rem" }}>
            <h1 style={{ margin: 0, fontSize: "2rem" }}>Financial Income & Expense Ledger</h1>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: "750",
                textTransform: "uppercase",
                padding: "0.2rem 0.65rem",
                borderRadius: "999px",
                backgroundColor: "var(--brand)",
                color: "white",
              }}
            >
              Full Ledger History
            </span>
          </div>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.95rem" }}>
            Complete historical audit of real customer orders income, daily raw materials, transport costs, and net profits.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <Link href="/admin" className="btn-secondary" style={{ fontSize: "0.9rem", padding: "0.55rem 1.1rem" }}>
            ← Back to Admin Panel
          </Link>
        </div>
      </div>

      {/* KPI Overview */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "2.5rem",
        }}
      >
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "18px", padding: "1.25rem", boxShadow: "0 2px 6px var(--shadow-color)" }}>
          <span style={{ fontSize: "0.78rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: "650" }}>Total Income / Revenue</span>
          <div style={{ fontSize: "1.65rem", fontWeight: "800", color: "var(--brand-dark)", marginTop: "0.3rem" }}>
            {totals.revenue.toLocaleString()} ETB
          </div>
          <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{totals.itemsSold} items sold</span>
        </div>

        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "18px", padding: "1.25rem", boxShadow: "0 2px 6px var(--shadow-color)" }}>
          <span style={{ fontSize: "0.78rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: "650" }}>Raw Materials Cost</span>
          <div style={{ fontSize: "1.65rem", fontWeight: "800", color: "#dc2626", marginTop: "0.3rem" }}>
            {totals.rawMaterials.toLocaleString()} ETB
          </div>
          <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Meat, berbere, dairy, produce</span>
        </div>

        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "18px", padding: "1.25rem", boxShadow: "0 2px 6px var(--shadow-color)" }}>
          <span style={{ fontSize: "0.78rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: "650" }}>Transport / Logistics</span>
          <div style={{ fontSize: "1.65rem", fontWeight: "800", color: "#e67e22", marginTop: "0.3rem" }}>
            {totals.transport.toLocaleString()} ETB
          </div>
          <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Courier fuel & delivery pay</span>
        </div>

        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "18px", padding: "1.25rem", boxShadow: "0 2px 6px var(--shadow-color)" }}>
          <span style={{ fontSize: "0.78rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: "650" }}>Net Operating Profit</span>
          <div style={{ fontSize: "1.65rem", fontWeight: "800", color: "#16a34a", marginTop: "0.3rem" }}>
            {totals.netProfit.toLocaleString()} ETB
          </div>
          <span style={{ fontSize: "0.8rem", color: "#16a34a", fontWeight: "650" }}>{totals.margin}% profit margin</span>
        </div>
      </div>

      {/* Comprehensive Ledger Table */}
      <section
        style={{
          background: "var(--card-bg)",
          borderRadius: "20px",
          border: "1px solid var(--border)",
          padding: "1.5rem",
          boxShadow: "0 4px 16px var(--shadow-color)",
          overflowX: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div>
            <h2 style={{ fontSize: "1.3rem", margin: "0 0 0.25rem" }}>Complete Daily Register ({ledger.length} Days)</h2>
            <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
              Income verified from customer checkout orders; expenses registered by administrator.
            </span>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.92rem" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border)", color: "var(--muted)" }}>
              <th style={{ padding: "0.85rem 0.75rem", fontWeight: "700" }}>Date</th>
              <th style={{ padding: "0.85rem 0.75rem", fontWeight: "700" }}>Sales Units</th>
              <th style={{ padding: "0.85rem 0.75rem", fontWeight: "700" }}>Income / Revenue</th>
              <th style={{ padding: "0.85rem 0.75rem", fontWeight: "700" }}>Raw Materials</th>
              <th style={{ padding: "0.85rem 0.75rem", fontWeight: "700" }}>Transport Cost</th>
              <th style={{ padding: "0.85rem 0.75rem", fontWeight: "700" }}>Total Expenses</th>
              <th style={{ padding: "0.85rem 0.75rem", fontWeight: "700" }}>Net Profit</th>
              <th style={{ padding: "0.85rem 0.75rem", fontWeight: "700" }}>Margin</th>
              <th style={{ padding: "0.85rem 0.75rem", fontWeight: "700" }}>Expense Notes</th>
            </tr>
          </thead>
          <tbody>
            {ledger.map((row, idx) => (
              <tr
                key={row.date}
                style={{
                  borderBottom: "1px solid var(--border)",
                  backgroundColor: idx % 2 === 0 ? "transparent" : "var(--brand-light)",
                }}
              >
                <td style={{ padding: "0.85rem 0.75rem", fontWeight: "700" }}>
                  {row.date}
                </td>
                <td style={{ padding: "0.85rem 0.75rem" }}>
                  {row.itemsSold} items ({row.ordersCount} orders)
                </td>
                <td style={{ padding: "0.85rem 0.75rem", fontWeight: "750", color: "var(--brand-dark)" }}>
                  {row.revenue.toLocaleString()} ETB
                </td>
                <td style={{ padding: "0.85rem 0.75rem", color: "#dc2626" }}>
                  -{row.rawMaterials.toLocaleString()} ETB
                </td>
                <td style={{ padding: "0.85rem 0.75rem", color: "#e67e22" }}>
                  -{row.transport.toLocaleString()} ETB
                </td>
                <td style={{ padding: "0.85rem 0.75rem", fontWeight: "650", color: "#dc2626" }}>
                  -{row.totalExpenses.toLocaleString()} ETB
                </td>
                <td style={{ padding: "0.85rem 0.75rem", fontWeight: "800", color: "#16a34a" }}>
                  +{row.netProfit.toLocaleString()} ETB
                </td>
                <td style={{ padding: "0.85rem 0.75rem", fontWeight: "700" }}>
                  {row.margin}%
                </td>
                <td style={{ padding: "0.85rem 0.75rem", fontSize: "0.82rem", color: "var(--muted)", maxWidth: "240px" }}>
                  {row.note}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
