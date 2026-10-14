"use client";

import { toCsv, downloadCsv } from "@/lib/csv";

export function ExportCsvButton({ rows }) {
  const handleExport = () => {
    if (!rows || rows.length === 0) {
      alert("No order records to export.");
      return;
    }

    const exportData = rows.map((r) => ({
      "Order ID": `#${r.id}`,
      "Customer Name": r.name,
      "Neighbourhood": r.neighbourhood || "Bole",
      "Status": r.status,
      "Total (ETB)": r.total,
      "Order Placed At (UTC)": r.createdAt,
    }));

    const csvText = toCsv(exportData);
    downloadCsv(csvText, `addis-eats-orders-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <button
      onClick={handleExport}
      className="btn-ghost"
      style={{
        fontSize: "0.85rem",
        padding: "0.4rem 1rem",
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
        cursor: "pointer",
      }}
      title="Export records to CSV"
    >
      <span></span> Export CSV
    </button>
  );
}
