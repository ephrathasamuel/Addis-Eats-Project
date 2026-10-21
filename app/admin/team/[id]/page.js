import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getPersonActivity, PERIODS } from "@/lib/team";
import { Avatar } from "@/components/Modal";
import { StaffHistory } from "@/components/StaffHistory";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Staff activity",
  robots: { index: false },
};

// One cook's or courier's profile and full activity, for the admin.
export default async function PersonPage({ params, searchParams }) {
  const user = await getSession();
  const { id } = await params;
  if (!user) redirect(`/staff/signin?next=${encodeURIComponent(`/admin/team/${id}`)}`);
  if (user.role !== "admin") redirect("/menu");

  const person = getPersonActivity(decodeURIComponent(id));
  if (!person) notFound();
  const requested = (await searchParams)?.period;
  const backPeriod = PERIODS[requested] ? requested : "7d";
  const kitchen = person.role === "staff";

  return (
    <div className="page-wide">
      <div className="page-heading">
        <Link href={`/admin/team?period=${backPeriod}`} className="btn-ghost">← Team</Link>
      </div>

      <section className="card-panel person-profile">
        <Avatar name={person.name} photo={person.photo} size={88} />
        <div className="person-profile__info">
          <h1>{person.name}</h1>
          <span className={`role-pill role-pill--${person.role}`}>{kitchen ? "Kitchen" : "Delivery"}</span>
          {person.removed ? (
            <p className="text-muted">No longer on staff. Their past work is kept below.</p>
          ) : (
            <p className="person-profile__contact">
              {person.phone && <a href={`tel:${person.phone}`}>{person.phone}</a>}
              {person.email && <a href={`mailto:${person.email}`}>{person.email}</a>}
              {person.joined && (
                <span className="text-muted">
                  On the team since {new Date(person.joined).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                </span>
              )}
            </p>
          )}
        </div>
        {!person.removed && (
          <Link href="/admin/staff" className="btn-ghost person-profile__manage">
            Manage account
          </Link>
        )}
      </section>

      <h2 className="history-heading">Performance</h2>
      <div className="period-cards">
        {person.periods.map((p) => (
          <div key={p.period} className="card-panel period-card">
            <span className="period-card__label">{p.label}</span>
            <span className="period-card__value">{p.orders}</span>
            <span className="text-muted">{kitchen ? (p.orders === 1 ? "order cooked" : "orders cooked") : p.orders === 1 ? "delivery" : "deliveries"}</span>
            <span className="period-card__meta">
              {p.rank ? `Rank ${p.rank} of ${p.of}` : "No work yet"}
              {p.avgMinutes ? ` · avg ${p.avgMinutes} min` : ""}
              {!kitchen && p.fees ? ` · ${p.fees.toLocaleString()} ETB` : ""}
              {kitchen && p.items ? ` · ${p.items} dishes` : ""}
            </span>
          </div>
        ))}
      </div>

      <h2 className="history-heading">Activity by day</h2>
      <StaffHistory history={person.history} showTotals={false} />
    </div>
  );
}
