import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getTeamCards, getTeamPerformance, PERIODS } from "@/lib/team";
import { Avatar } from "@/components/Modal";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Team performance",
  robots: { index: false },
};

const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Addis_Ababa" });
const formatDay = (day) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

// One clickable card per person, linking to their activity page.
function PersonCard({ person, kind, period }) {
  return (
    <Link href={`/admin/team/${encodeURIComponent(person.id)}?period=${period}`} className="person-card">
      <div className="person-card__top">
        <Avatar name={person.name} photo={person.photo} size={52} />
        <div className="person-card__who">
          <strong>{person.name}</strong>
          <span>{person.removed ? "No longer on staff" : kind === "kitchen" ? "Kitchen" : "Delivery"}</span>
        </div>
        {person.rank ? (
          <span className={`rank-badge rank-badge--${Math.min(person.rank, 4)}`} title={`Rank ${person.rank}`}>
            {person.rank}
          </span>
        ) : null}
      </div>
      <div className="person-card__stats">
        <div>
          <span className="person-card__value">{person.orders}</span>
          <span className="person-card__label">{kind === "kitchen" ? "orders cooked" : "deliveries"}</span>
        </div>
        <div>
          <span className="person-card__value">
            {kind === "kitchen" ? person.items ?? 0 : `${(person.fees ?? 0).toLocaleString()}`}
          </span>
          <span className="person-card__label">{kind === "kitchen" ? "dishes" : "ETB in fees"}</span>
        </div>
        <div>
          <span className="person-card__value">{person.avgMinutes ? `${person.avgMinutes}` : "-"}</span>
          <span className="person-card__label">{kind === "kitchen" ? "avg cook min" : "avg delivery min"}</span>
        </div>
      </div>
      <span className="person-card__more">View activity →</span>
    </Link>
  );
}

function TeamSection({ title, people, kind, period }) {
  return (
    <section className="team-section">
      <h2 className="history-heading">
        {title} <span className="count">{people.length}</span>
      </h2>
      {people.length === 0 ? (
        <p className="board-empty">
          No {kind === "kitchen" ? "kitchen staff" : "couriers"} yet. Register them under <Link href="/admin/staff">Staff</Link>.
        </p>
      ) : (
        <div className="person-grid">
          {people.map((person) => (
            <PersonCard key={person.id} person={person} kind={kind} period={period} />
          ))}
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
  const cards = getTeamCards(period);
  const { days } = getTeamPerformance(period);

  return (
    <div className="page-wide">
      <div className="page-heading">
        <div>
          <h1>Team</h1>
          <p>Ranked by work finished; faster average times break ties. Click a person to see their activity.</p>
        </div>
        <Link href="/admin" className="btn-ghost">← Admin panel</Link>
      </div>

      <div className="segmented" role="group" aria-label="Period" style={{ marginBottom: "0.5rem" }}>
        {Object.entries(PERIODS).map(([key, label]) => (
          <Link key={key} href={`/admin/team?period=${key}`} className={`segmented__link ${key === period ? "is-active" : ""}`}>
            {label}
          </Link>
        ))}
      </div>

      <TeamSection title="Kitchen team" people={cards.kitchen} kind="kitchen" period={period} />
      <TeamSection title="Delivery team" people={cards.delivery} kind="delivery" period={period} />

      <details className="card-panel history-day team-log">
        <summary>
          <strong>Daily log: every order and who handled it</strong>
          <span className="text-muted">{days.length} day{days.length === 1 ? "" : "s"}</span>
        </summary>
        {days.length === 0 ? (
          <p className="text-muted">No finished orders in this period.</p>
        ) : (
          <div className="history-days">
            {days.map((day) => (
              <div key={day.day} className="team-log__day">
                <h3>
                  {formatDay(day.day)}{" "}
                  <span className="text-muted">
                    · {day.cooked.length} cooked · {day.delivered.length} delivered
                  </span>
                </h3>
                <div className="team-day">
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
                  <ul className="history-list">
                    {day.delivered.map((entry) => (
                      <li key={entry.orderId}>
                        <span className="history-list__time">{formatTime(entry.at)}</span>
                        <span className="history-list__main">
                          <strong>#{entry.orderId}</strong> {entry.by} to {entry.location}
                          {entry.km ? ` (${entry.km} km)` : ""}
                        </span>
                        <span className="history-list__meta">
                          {entry.minutes ? `${entry.minutes} min · ` : ""}+{entry.fee} ETB
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}
      </details>
    </div>
  );
}
