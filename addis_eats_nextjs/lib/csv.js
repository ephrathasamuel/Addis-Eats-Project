/**
 * Robust CSV export module with double-quote escaping for values with commas, quotes, and newlines.
 */

export function toCsv(rows) {
  if (!rows || rows.length === 0) return "";

  // Escaping rule: if the value has quotes, commas, or newlines, wrap in quotes and escape internal quotes by doubling them ("")
  const cell = (v) => {
    const s = String(v ?? "");
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const headers = Object.keys(rows[0]);
  const headerLine = headers.map(cell).join(",");
  const rowLines = rows.map((r) => headers.map((k) => cell(r[k])).join(","));

  return [headerLine, ...rowLines].join("\n");
}

export function downloadCsv(text, filename = "addis-eats-orders.csv") {
  if (typeof window === "undefined") return;
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
