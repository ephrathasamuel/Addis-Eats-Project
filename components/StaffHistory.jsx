// A staff member's own work history, one collapsible section per day.
const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Addis_Ababa" });
const formatDay = (day) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

function Totals({ kind, totals }) {
  return (
    <div className="stat-row">
      <div className="stat stat--green">
        <span className="stat__label">{kind === "kitchen" ? "Orders cooked" : "Deliveries"}</span>
        <span className="stat__value">{totals.orders}</span>
      </div>
      {kind === "kitchen" ? (
        <div className="stat">
          <span className="stat__label">Dishes prepared</span>
          <span className="stat__value">{totals.items}</span>
        </div>
      ) : (
        <div className="stat">
          <span className="stat__label">Fees earned</span>
          <span className="stat__value">{totals.fees.toLocaleString()} ETB</span>
        </div>
      )}
      <div className="stat stat--blue">
        <span className="stat__label">{kind === "kitchen" ? "Avg cooking time" : "Avg delivery time"}</span>
        <span className="stat__value">{totals.avgMinutes ? `${totals.avgMinutes} min` : "-"}</span>
      </div>
      {kind === "delivery" && (
        <div className="stat stat--orange">
          <span className="stat__label">Distance driven</span>
          <span className="stat__value">{totals.km} km</span>
        </div>
      )}
    </div>
  );
}

export function StaffHistory({ history }) {
  const { kind, totals, days } = history;
  if (days.length === 0) {
    return <p className="board-empty">Nothing yet. Your finished {kind === "kitchen" ? "orders" : "deliveries"} will show here.</p>;
  }
  return (
    <div>
      <h2 className="history-heading">All time</h2>
      <Totals kind={kind} totals={totals} />
      <h2 className="history-heading">By day</h2>
      <div className="history-days">
        {days.map((day, index) => (
          <details key={day.day} className="card-panel history-day" open={index === 0}>
            <summary>
              <strong>{formatDay(day.day)}</strong>
              <span className="text-muted">
                {day.summary.orders} {kind === "kitchen" ? "orders" : "deliveries"}
                {kind === "kitchen" ? ` · ${day.summary.items} dishes` : ` · ${day.summary.fees.toLocaleString()} ETB`}
                {day.summary.avgMinutes ? ` · avg ${day.summary.avgMinutes} min` : ""}
              </span>
            </summary>
            <ul className="history-list">
              {day.entries.map((entry) => (
                <li key={entry.orderId}>
                  <span className="history-list__time">{formatTime(entry.at)}</span>
                  <span className="history-list__main">
                    <strong>#{entry.orderId}</strong>{" "}
                    {kind === "kitchen" ? entry.items.join(", ") : `${entry.location}${entry.km ? ` · ${entry.km} km` : ""}`}
                  </span>
                  <span className="history-list__meta">
                    {entry.minutes ? `${entry.minutes} min` : ""}
                    {kind === "delivery" ? ` · +${entry.fee} ETB${entry.confirmed ? " · confirmed" : ""}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </div>
  );
}
