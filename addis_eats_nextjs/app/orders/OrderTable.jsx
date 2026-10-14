import Link from "next/link";
import { ExportCsvButton } from "./ExportCsvButton";
import { etb, when } from "@/lib/format";

export function OrderTable({ rows, total, totalPages, currentPage, sort, dir }) {
  const getSortUrl = (column) => {
    const nextDir = sort === column && dir === "asc" ? "desc" : "asc";
    const params = new URLSearchParams();
    params.set("sort", column);
    params.set("dir", nextDir);
    params.set("page", "1");
    return `/orders?${params.toString()}`;
  };

  const getPageUrl = (targetPage) => {
    const params = new URLSearchParams();
    if (sort) params.set("sort", sort);
    if (dir) params.set("dir", dir);
    params.set("page", String(targetPage));
    return `/orders?${params.toString()}`;
  };

  const sortIndicator = (column) => {
    if (sort !== column) return " ↕";
    return dir === "asc" ? " ↑" : " ↓";
  };

  return (
    <div>
      <div
        style={{
          background: "var(--card-bg)",
          borderRadius: "20px",
          border: "1px solid var(--border)",
          boxShadow: "0 2px 8px var(--shadow-color)",
          overflowX: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div style={{ fontWeight: "700", fontSize: "1.1rem" }}>
            Order History ({total} total transactions)
          </div>
          <ExportCsvButton rows={rows} />
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.95rem" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border)", background: "var(--brand-light)" }}>
              <th scope="col" style={{ padding: "0.9rem 1.25rem" }}>
                <Link href={getSortUrl("id")} style={{ color: "var(--text)", textDecoration: "none" }}>
                  Order #{sortIndicator("id")}
                </Link>
              </th>
              <th scope="col" style={{ padding: "0.9rem 1.25rem" }}>
                <Link href={getSortUrl("date")} style={{ color: "var(--text)", textDecoration: "none" }}>
                  Date & Time{sortIndicator("date")}
                </Link>
              </th>
              <th scope="col" style={{ padding: "0.9rem 1.25rem" }}>
                Customer
              </th>
              <th scope="col" style={{ padding: "0.9rem 1.25rem" }}>
                Neighbourhood
              </th>
              <th scope="col" style={{ padding: "0.9rem 1.25rem" }}>
                <Link href={getSortUrl("status")} style={{ color: "var(--text)", textDecoration: "none" }}>
                  Status{sortIndicator("status")}
                </Link>
              </th>
              <th scope="col" style={{ padding: "0.9rem 1.25rem", textAlign: "right" }}>
                <Link href={getSortUrl("total")} style={{ color: "var(--text)", textDecoration: "none" }}>
                  Total (ETB){sortIndicator("total")}
                </Link>
              </th>
              <th scope="col" style={{ padding: "0.9rem 1.25rem", textAlign: "center" }}>
                Tracking & Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((order) => (
              <tr key={order.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "0.9rem 1.25rem", fontWeight: "600" }}>#{order.id}</td>
                <td style={{ padding: "0.9rem 1.25rem", color: "var(--muted)", fontSize: "0.88rem" }}>
                  {when.format(new Date(order.createdAt))}
                </td>
                <td style={{ padding: "0.9rem 1.25rem" }}>{order.name}</td>
                <td style={{ padding: "0.9rem 1.25rem" }}>{order.neighbourhood || "Bole"}</td>
                <td style={{ padding: "0.9rem 1.25rem" }}>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      padding: "0.25rem 0.65rem",
                      borderRadius: "999px",
                      backgroundColor:
                        order.status === "delivered"
                          ? "rgba(34, 197, 94, 0.15)"
                          : order.status === "cancelled"
                          ? "rgba(239, 68, 68, 0.15)"
                          : "var(--brand-light)",
                      color:
                        order.status === "delivered"
                          ? "#16a34a"
                          : order.status === "cancelled"
                          ? "#dc2626"
                          : "var(--brand-dark)",
                    }}
                  >
                    {order.status}
                  </span>
                </td>
                <td
                  style={{
                    padding: "0.9rem 1.25rem",
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                    fontWeight: "700",
                  }}
                >
                  {etb.format(order.total)}
                </td>
                <td style={{ padding: "0.9rem 1.25rem", textAlign: "center" }}>
                  <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                    <Link
                      href={`/track/${order.id}`}
                      className="btn-primary"
                      style={{ fontSize: "0.8rem", padding: "0.3rem 0.8rem" }}
                    >
                      Map Track 
                    </Link>
                    <Link
                      href={`/orders/${order.id}`}
                      className="btn-ghost"
                      style={{ fontSize: "0.8rem", padding: "0.3rem 0.75rem" }}
                    >
                      Poll
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paging controls */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "1.5rem",
            padding: "0 0.5rem",
          }}
        >
          <div style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
            Showing page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            {currentPage > 1 ? (
              <Link href={getPageUrl(currentPage - 1)} className="btn-ghost">
                ← Previous
              </Link>
            ) : (
              <span className="btn-ghost" style={{ opacity: 0.4, pointerEvents: "none" }}>
                ← Previous
              </span>
            )}

            {currentPage < totalPages ? (
              <Link href={getPageUrl(currentPage + 1)} className="btn-ghost">
                Next →
              </Link>
            ) : (
              <span className="btn-ghost" style={{ opacity: 0.4, pointerEvents: "none" }}>
                Next →
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
