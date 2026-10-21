import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getTeamPerformance, PERIODS } from "@/lib/team";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Team performance",
  robots: { index: false },
};

const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Addis_Ababa" });
const formatDay = (day) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

function RankingTable({ title, people, kind }) {
  return (
    <section className="card-panel">
      <h2>{title}</h2>
      {people.length === 0 ? (
        <p className="text-muted">No finished work in this period.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="team-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>{kind === "kitchen" ? "Orders cooked" : "Deliveries"}</th>
                <th>{kind === "kitchen" ? "Dishes" : "Fees"}</th>
                <th>{kind === "kitchen" ? "Avg cooking" : "Avg delivery"}</th>
                {kind === "delivery" && <th>Customer confirmed</th>}
              </tr>
            </thead>
            <tbody>
              {people.map((person) => (
                <tr key={person.id} className={person.rank === 1 ? "team-table__top" : ""}>
                  <td><span className={`rank-badge rank-badge--${Math.min(person.rank, 4)}`}>{person.rank}</span></td>
                  <td><strong>{person.name}</strong></td>
                  <td>{person.orders}</td>
                  <td>{kind === "kitchen" ? person.items : `${person.fees.toLocaleString()} ETB`}</td>
                  <td>{person.avgMinutes ? `${person.avgMinutes} min` : "-"}</td>
                  {kind === "delivery" && <td>{person.orders ? `${Math.round((person.confirmed / person.orders) * 100)}%` : "-"}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default async function TeamPage({ searchParams }) {
  const user = await getSession();
  if (!user) redirect("/staff/signin?next=/admin/team");
  if (user.role !== "admin") redirect("/menu");

  const requested = (await searchParams)?.period;
  const period = PERIODS[requested] ? requested : "7d";
  const team = getTeamPerformance(period);
  const allDays = team.days;

  return (
    <div className="page-wide">
      <div className="page-heading">
        <div>
          <h1>Team performance</h1>
          <p>Who cooked and delivered what, ranked by work finished. Faster average times break ties.</p>
        </div>
        <Link href="/admin" className="btn-ghost">← Admin panel</Link>
      </div>

      <div className="segmented" role="group" aria-label="Period" style={{ marginBottom: "1rem" }}>
        {Object.entries(PERIODS).map(([key, label]) => (
          <Link key={key} href={`/admin/team?period=${key}`} className={`segmented__link ${key === period ? "is-active" : ""}`}>
            {label}
          </Link>
        ))}
      </div>

      <div className="team-rankings">
        <RankingTable title="Kitchen ranking" people={team.cooks} kind="kitchen" />
        <RankingTable title="Delivery ranking" people={team.couriers} kind="delivery" />
      </div>

      <h2 className="history-heading">Day by day</h2>
      {allDays.length === 0 ? (
        <p className="board-empty">No finished orders in this period.</p>
      ) : (
        <div className="history-days">
          {allDays.map((day, index) => (
            <details key={day.day} className="card-panel history-day" open={index === 0}>
              <summary>
                <strong>{formatDay(day.day)}</strong>
                <span className="text-muted">
                  {day.cooked.length} cooked · {day.delivered.length} delivered
                </span>
              </summary>
              <div className="team-day">
                <div>
                  <h3>Kitchen</h3>
                  {day.cooked.length === 0 ? (
                    <p className="text-muted">Nothing cooked.</p>
                  ) : (
                    <ul className="history-list">
                      {day.cooked.map((entry) => (
                        <li key={entry.orderId}>
                          <span className="history-list__time">{formatTime(entry.at)}</span>
                          <span className="history-list__main">
                            <strong>#{entry.orderId}</strong> {entry.by}: {entry.items.join(", ")}
                          </span>
                          <span className="history-list__meta">{entry.minutes ? `${entry.minutes} min` : ""}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h3>Delivery</h3>
                  {day.delivered.length === 0 ? (
                    <p className="text-muted">Nothing delivered.</p>
                  ) : (
                    <ul className="history-list">
                      {day.delivered.map((entry) => (
                        <li key={entry.orderId}>
                          <span className="history-list__time">{formatTime(entry.at)}</span>
                          <span className="history-list__main">
                            <strong>#{entry.orderId}</strong> {entry.by} to {entry.location}
                            {entry.km ? ` (${entry.km} km)` : ""}
                          </span>
                          <span className="history-list__meta">
                            {entry.minutes ? `${entry.minutes} min · ` : ""}+{entry.fee} ETB{entry.confirmed ? " · confirmed" : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
