"use client";

export default function OrdersError({ error, reset }) {
  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "4rem auto",
        textAlign: "center",
        padding: "2.5rem 1.5rem",
        background: "var(--card-bg)",
        borderRadius: "20px",
        border: "1px solid var(--border)",
        boxShadow: "0 2px 8px var(--shadow-color)",
      }}
    >
      <h2 style={{ color: "var(--danger)", margin: "0 0 0.5rem" }}>Failed to load transactions</h2>
      <p style={{ color: "var(--muted)", marginBottom: "1.75rem" }}>
        {error?.message || "A temporary database failure occurred while querying order history."}
      </p>
      <button onClick={() => reset()} className="btn-primary">
        Retry query
      </button>
    </div>
  );
}
