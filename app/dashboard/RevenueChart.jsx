"use client";

import { useState } from "react";

export function RevenueChart({ revenueByNeighbourhood, ordersOverTime }) {
  const [activeTab, setActiveTab] = useState("charts");

  // Max revenue for bar scaling (axis starts at zero)
  const maxRevenue = Math.max(...revenueByNeighbourhood.map((r) => r.revenue), 1000);
  const maxOrders = Math.max(...ordersOverTime.map((o) => o.count), 5);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => setActiveTab("charts")}
            className={activeTab === "charts" ? "btn-primary" : "btn-ghost"}
            style={{ fontSize: "0.85rem", padding: "0.4rem 1rem" }}
          >
            Visual Charts
          </button>
          <button
            onClick={() => setActiveTab("tables")}
            className={activeTab === "tables" ? "btn-primary" : "btn-ghost"}
            style={{ fontSize: "0.85rem", padding: "0.4rem 1rem" }}
          >
            Accessible Data Tables
          </button>
        </div>
        <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
          Data currency: Ethiopian Birr (ETB)
        </span>
      </div>

      {/* 1. Bar Chart: Revenue by Neighbourhood */}
      <div
        style={{
          background: "var(--card-bg)",
          borderRadius: "20px",
          padding: "1.5rem",
          border: "1px solid var(--border)",
          boxShadow: "0 2px 8px var(--shadow-color)",
          marginBottom: "2rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1.25rem" }}>
          <h3 style={{ margin: 0 }}>Revenue by Neighbourhood</h3>
          <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
            Unit: Total ETB (Axis starts at 0 ETB)
          </span>
        </div>

        {/* Fixed-height SVG Bar Chart */}
        <div style={{ height: "240px", width: "100%", position: "relative" }}>
          <svg
            viewBox="0 0 600 220"
            style={{ width: "100%", height: "100%", overflow: "visible" }}
            role="img"
            aria-label="Bar chart showing revenue distribution across Addis Ababa neighbourhoods"
          >
            {/* Horizontal Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
              const y = 180 - pct * 150;
              const val = Math.round(maxRevenue * pct);
              return (
                <g key={i}>
                  <line x1="40" y1={y} x2="580" y2={y} stroke="var(--border)" strokeDasharray="3 3" />
                  <text x="35" y={y + 4} fill="var(--muted)" fontSize="10" textAnchor="end">
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Bars */}
            {revenueByNeighbourhood.map((item, index) => {
              const barWidth = 44;
              const gap = 85;
              const x = 70 + index * gap;
              const barHeight = (item.revenue / maxRevenue) * 150;
              const y = 180 - barHeight;

              return (
                <g key={item.neighbourhood}>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx="6"
                    fill="var(--brand)"
                    style={{ transition: "all 0.3s ease" }}
                  />
                  <text
                    x={x + barWidth / 2}
                    y={y - 6}
                    fill="var(--text)"
                    fontSize="11"
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    {item.revenue}
                  </text>
                  <text
                    x={x + barWidth / 2}
                    y="200"
                    fill="var(--muted)"
                    fontSize="11"
                    fontWeight="500"
                    textAnchor="middle"
                  >
                    {item.neighbourhood}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* 2. Line Chart: Orders over Time */}
      <div
        style={{
          background: "var(--card-bg)",
          borderRadius: "20px",
          padding: "1.5rem",
          border: "1px solid var(--border)",
          boxShadow: "0 2px 8px var(--shadow-color)",
          marginBottom: "2rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1.25rem" }}>
          <h3 style={{ margin: 0 }}>Orders Over Time (Past 7 Days)</h3>
          <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
            Unit: Completed Orders / Day
          </span>
        </div>

        {/* Fixed-height SVG Line Chart */}
        <div style={{ height: "220px", width: "100%", position: "relative" }}>
          <svg
            viewBox="0 0 600 200"
            style={{ width: "100%", height: "100%", overflow: "visible" }}
            role="img"
            aria-label="Line chart depicting daily order counts over the past 7 days"
          >
            {/* Grid lines */}
            {[0, 1, 2, 3, 4, 5].map((val) => {
              const y = 160 - (val / maxOrders) * 130;
              return (
                <g key={val}>
                  <line x1="40" y1={y} x2="580" y2={y} stroke="var(--border)" strokeDasharray="3 3" />
                  <text x="35" y={y + 4} fill="var(--muted)" fontSize="10" textAnchor="end">
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Line Path */}
            {(() => {
              const points = ordersOverTime.map((d, i) => {
                const x = 60 + i * (500 / (ordersOverTime.length - 1 || 1));
                const y = 160 - (d.count / maxOrders) * 130;
                return { x, y, ...d };
              });

              const pathD = points.reduce(
                (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
                ""
              );

              return (
                <g>
                  <path d={pathD} fill="none" stroke="var(--brand-dark)" strokeWidth="3" strokeLinecap="round" />
                  {points.map((p, i) => (
                    <g key={i}>
                      <circle cx={p.x} cy={p.y} r="5" fill="var(--card-bg)" stroke="var(--brand)" strokeWidth="3" />
                      <text x={p.x} y={p.y - 10} fill="var(--text)" fontSize="11" fontWeight="700" textAnchor="middle">
                        {p.count}
                      </text>
                      <text x={p.x} y="180" fill="var(--muted)" fontSize="10" textAnchor="middle">
                        {p.label}
                      </text>
                    </g>
                  ))}
                </g>
              );
            })()}
          </svg>
        </div>
      </div>

      {/* Accessible Table Beneath the Charts for Screen Readers and Data Inspection */}
      <div
        style={{
          background: "var(--card-bg)",
          borderRadius: "20px",
          padding: "1.5rem",
          border: "1px solid var(--border)",
          boxShadow: "0 2px 8px var(--shadow-color)",
          display: activeTab === "tables" ? "block" : "block",
        }}
      >
        <h4 style={{ marginTop: 0, marginBottom: "0.75rem" }}>Tabular Data Representation (Accessible Alternative)</h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
          <div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <caption style={{ textAlign: "left", fontWeight: "600", marginBottom: "0.5rem", color: "var(--muted)" }}>
                Neighbourhood Revenue Table
              </caption>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)" }}>
                  <th scope="col" style={{ textAlign: "left", padding: "0.5rem 0" }}>Neighbourhood</th>
                  <th scope="col" style={{ textAlign: "right", padding: "0.5rem 0" }}>Revenue (ETB)</th>
                </tr>
              </thead>
              <tbody>
                {revenueByNeighbourhood.map((r) => (
                  <tr key={r.neighbourhood} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "0.5rem 0" }}>{r.neighbourhood}</td>
                    <td style={{ textAlign: "right", padding: "0.5rem 0", fontVariantNumeric: "tabular-nums", fontWeight: "600" }}>
                      {r.revenue} ETB
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <caption style={{ textAlign: "left", fontWeight: "600", marginBottom: "0.5rem", color: "var(--muted)" }}>
                Daily Order Volume Table
              </caption>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)" }}>
                  <th scope="col" style={{ textAlign: "left", padding: "0.5rem 0" }}>Date</th>
                  <th scope="col" style={{ textAlign: "right", padding: "0.5rem 0" }}>Order Count</th>
                </tr>
              </thead>
              <tbody>
                {ordersOverTime.map((o) => (
                  <tr key={o.date} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "0.5rem 0" }}>{o.label}</td>
                    <td style={{ textAlign: "right", padding: "0.5rem 0", fontVariantNumeric: "tabular-nums", fontWeight: "600" }}>
                      {o.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
