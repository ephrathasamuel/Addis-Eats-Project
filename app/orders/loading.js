export default function OrdersLoading() {
  return (
    <div style={{ maxWidth: "1040px", margin: "2rem auto", padding: "0 1.5rem" }}>
      <div
        style={{
          height: "36px",
          width: "220px",
          backgroundColor: "var(--border)",
          borderRadius: "8px",
          marginBottom: "2rem",
          opacity: 0.7,
        }}
      />
      <div
        style={{
          background: "var(--card-bg)",
          borderRadius: "20px",
          border: "1px solid var(--border)",
          padding: "1.5rem",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: "48px",
                backgroundColor: "var(--brand-light)",
                borderRadius: "10px",
                opacity: 0.7,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
