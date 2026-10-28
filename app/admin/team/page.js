import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getTeamCards, getTeamLog, PERIODS } from "@/lib/team";
import { Avatar } from "@/components/Modal";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Team performance",
  robots: { index: false },
};

const TEAMS = { kitchen: "Kitchen team", delivery: "Delivery team" };

const formatTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Addis_Ababa" }) : "";
const formatDay = (day) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const teamUrl = (team, period) => `/admin/team?team=${team}&period=${period}`;

// One clickable card per person, linking to their activity page.
function PersonCard({ person, kind, period }) {
  return (
    <Link href={`/admin/team/${encodeURIComponent(person.id)}?period=${period}`} className="person-card">
      <div className="person-card__top">
        <Avatar name={person.name} photo={person.photo} size={52} />
        <div className="person-card__who">
          <strong>{person.name}</strong>
          <span>
            {person.removed ? "No longer on staff" : kind === "kitchen" ? "Kitchen" : "Delivery"}
            {person.rating ? (
              <span className="person-card__rating" title={`${person.ratingCount} customer rating${person.ratingCount === 1 ? "" : "s"}`}>
                {" "}· ★ {person.rating.toFixed(1)}
              </span>
            ) : null}
          </span>
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

// Big numbers for the whole team over the chosen period.
function TeamTotals({ kind, totals, people }) {
  const stats =
    kind === "kitchen"
      ? [
          [totals.orders, totals.orders === 1 ? "order cooked" : "orders cooked"],
          [totals.items, totals.items === 1 ? "dish made" : "dishes made"],
          [totals.avgMinutes ? `${totals.avgMinutes} min` : "-", "average cooking time"],
          [people, people === 1 ? "cook" : "cooks"],
        ]
      : [
          [totals.orders, totals.orders === 1 ? "delivery" : "deliveries"],
          [`${totals.fees.toLocaleString()} ETB`, "delivery fees"],
          [totals.km ? `${totals.km} km` : "-", "driven"],
          [totals.avgMinutes ? `${totals.avgMinutes} min` : "-", "average delivery time"],
        ];
  return (
    <div className="team-totals">
      {stats.map(([value, label]) => (
        <div key={label} className="team-totals__item">
          <span className="team-totals__value">{value}</span>
          <span className="team-totals__label">{label}</span>
        </div>
      ))}
    </div>
  );
}

// One day of the log: a plain sentence, who did how much, then every order.
function LogDay({ day, kind, period, open }) {
  const { summary } = day;
  const headline =
    kind === "kitchen"
      ? `${plural(summary.orders, "order", "orders")} cooked, ${plural(summary.items, "dish", "dishes")}`
      : `${plural(summary.orders, "delivery", "deliveries")}, ${summary.fees.toLocaleString()} ETB in fees`;

  return (
    <details className="log-day" open={open}>
      <summary>
        <span className="log-day__date">{formatDay(day.day)}</span>
        <span className="log-day__headline">
          {headline}
          {summary.avgMinutes ? ` · avg ${summary.avgMinutes} min` : ""}
        </span>
      </summary>

      <div className="log-day__people">
        {day.people.map((person) => (
          <Link key={person.id} href={`/admin/team/${encodeURIComponent(person.id)}?period=${period}`} className="log-chip">
            <strong>{person.name}</strong>{" "}
            {kind === "kitchen"
              ? plural(person.orders, "order", "orders")
              : `${plural(person.orders, "delivery", "deliveries")} · ${person.fees.toLocaleString()} ETB`}
          </Link>
        ))}
      </div>

      <table className="log-table">
        <thead>
          {kind === "kitchen" ? (
            <tr>
              <th>Order</th>
              <th>Cook</th>
              <th>What was cooked</th>
              <th>Started</th>
              <th>Ready</th>
              <th>Took</th>
              <th>Rating</th>
            </tr>
          ) : (
            <tr>
              <th>Order</th>
              <th>Courier</th>
              <th>Delivered to</th>
              <th>Left</th>
              <th>Arrived</th>
              <th>Took</th>
              <th>Rating</th>
              <th>Fee</th>
            </tr>
          )}
        </thead>
        <tbody>
          {day.entries.map((entry) =>
            kind === "kitchen" ? (
              <tr key={entry.orderId}>
                <td data-label="Order"><strong>#{entry.orderId}</strong></td>
                <td data-label="Cook">{entry.by}</td>
                <td data-label="What was cooked">
                  <div>
                    {entry.items.map((item, index) => (
                      <span key={index} className="log-table__dish">{item}</span>
                    ))}
                  </div>
                </td>
                <td data-label="Started">{formatTime(entry.start) || "-"}</td>
                <td data-label="Ready">{formatTime(entry.at)}</td>
                <td data-label="Took">{entry.minutes ? `${entry.minutes} min` : "-"}</td>
                <td data-label="Rating">{entry.rating ? `★ ${entry.rating}` : "-"}</td>
              </tr>
            ) : (
              <tr key={entry.orderId}>
                <td data-label="Order"><strong>#{entry.orderId}</strong></td>
                <td data-label="Courier">{entry.by}</td>
                <td data-label="Delivered to">
                  <span>
                    {entry.location || "-"}
                    {entry.km ? <span className="text-muted"> ({entry.km} km)</span> : null}
                  </span>
                </td>
                <td data-label="Left">{formatTime(entry.start) || "-"}</td>
                <td data-label="Arrived">{formatTime(entry.at)}</td>
                <td data-label="Took">{entry.minutes ? `${entry.minutes} min` : "-"}</td>
                <td data-label="Rating">{entry.rating ? `★ ${entry.rating}` : "-"}</td>
                <td data-label="Fee">{entry.fee.toLocaleString()} ETB</td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </details>
  );
}

export default async function TeamPage({ searchParams }) {
  const user = await getSession();
  if (!user) redirect("/staff/signin?next=/admin/team");
  if (user.role !== "admin") redirect("/menu");

  const query = (await searchParams) || {};
  const period = PERIODS[query.period] ? query.period : "7d";
  const team = TEAMS[query.team] ? query.team : "kitchen";
  const cards = getTeamCards(period);
  const people = team === "kitchen" ? cards.kitchen : cards.delivery;
  const log = getTeamLog(team, period);

  return (
    <div className="page-wide">
      <div className="page-heading">
        <div>
          <h1>Team</h1>
          <p>Pick a team and a period. Click a person to see everything they did.</p>
        </div>
        <Link href="/admin" className="btn-ghost">← Admin panel</Link>
      </div>

      <div className="team-toolbar">
        <div className="team-tabs" role="tablist" aria-label="Team">
          {Object.entries(TEAMS).map(([key, label]) => (
            <Link
              key={key}
              href={teamUrl(key, period)}
              role="tab"
              aria-selected={key === team}
              className={`team-tab ${key === team ? "is-active" : ""}`}
            >
              {label} <span className="count">{(key === "kitchen" ? cards.kitchen : cards.delivery).length}</span>
            </Link>
          ))}
        </div>
        <div className="segmented" role="group" aria-label="Period">
          {Object.entries(PERIODS).map(([key, label]) => (
            <Link key={key} href={teamUrl(team, key)} className={`segmented__link ${key === period ? "is-active" : ""}`}>
              {label}
            </Link>
          ))}
        </div>
      </div>

      <section className="card-panel team-panel">
        <h2 className="team-panel__title">
          {TEAMS[team]} <span className="text-muted">· {PERIODS[period].toLowerCase()}</span>
        </h2>
        <TeamTotals kind={log.kind} totals={log.totals} people={people.filter((p) => p.orders > 0).length} />

        <h3 className="team-panel__heading">People</h3>
        {people.length === 0 ? (
          <p className="board-empty">
            No {team === "kitchen" ? "kitchen staff" : "couriers"} yet. Register them under <Link href="/admin/staff">Staff</Link>.
          </p>
        ) : (
          <div className="person-grid">
            {people.map((person) => (
              <PersonCard key={person.id} person={person} kind={team} period={period} />
            ))}
          </div>
        )}

        <h3 className="team-panel__heading">Daily log</h3>
        <p className="text-muted team-panel__hint">
          {team === "kitchen"
            ? "Every order the kitchen finished, by day: who cooked it, what was in it and how long it took."
            : "Every delivery, by day: who took it, where it went, how long the ride took and the fee."}
        </p>
        {log.days.length === 0 ? (
          <p className="board-empty">
            No {team === "kitchen" ? "orders cooked" : "deliveries"} in this period.
          </p>
        ) : (
          <div className="log-days">
            {log.days.map((day, index) => (
              <LogDay key={day.day} day={day} kind={team} period={period} open={index === 0} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
