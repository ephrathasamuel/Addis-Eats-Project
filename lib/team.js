import "server-only";
import { getAllOrders } from "@/lib/orders";
import { addisDay } from "@/lib/finances";
import { getAccount, listStaff } from "@/lib/accounts";

// Work history and performance, computed from real orders. Names come from
// the order itself (kitchenStaffName / courierName), so history stays intact
// even after a staff member is removed.

const DAY_MS = 24 * 60 * 60 * 1000;
export const PERIODS = { today: "Today", "7d": "Last 7 days", "30d": "Last 30 days", all: "All time" };

function minutesBetween(start, end) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Number.isFinite(ms) && ms > 0 ? Math.max(1, Math.round(ms / 60000)) : null;
}

function cookedAt(order) {
  return ["served", "on-the-way", "delivered"].includes(order.status) ? order.kitchenServedAt : null;
}

function itemCount(order) {
  return (order.items || []).reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
}

function startDayFor(period) {
  if (period === "today") return addisDay();
  if (period === "7d") return addisDay(Date.now() - 6 * DAY_MS);
  if (period === "30d") return addisDay(Date.now() - 29 * DAY_MS);
  return "0000-00-00";
}

function cookEntry(order) {
  return {
    orderId: order.id,
    day: addisDay(order.kitchenServedAt),
    at: order.kitchenServedAt,
    start: order.cookingStartedAt || null,
    items: (order.items || []).map((item) => `${item.qty}× ${item.name}`),
    itemCount: itemCount(order),
    minutes: Number(order.cookMinutes) || minutesBetween(order.cookingStartedAt, order.kitchenServedAt),
    rating: Number(order.cookRating) || null,
  };
}

function deliveryEntry(order) {
  return {
    orderId: order.id,
    day: addisDay(order.deliveredAt),
    at: order.deliveredAt,
    start: order.deliveryStartedAt || null,
    location: order.location,
    km: order.deliveryKm ?? order.driveEstimate?.km ?? null,
    fee: Number(order.deliveryFee) || 0,
    minutes: Number(order.deliveryDurationMinutes) || minutesBetween(order.deliveryStartedAt, order.deliveredAt),
    confirmed: Boolean(order.confirmedByCustomer),
    rating: Number(order.courierRating) || null,
  };
}

function groupByDay(entries) {
  const days = new Map();
  for (const entry of entries) {
    if (!days.has(entry.day)) days.set(entry.day, []);
    days.get(entry.day).push(entry);
  }
  return [...days.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([day, list]) => ({ day, entries: list.sort((a, b) => String(b.at).localeCompare(String(a.at))) }));
}

const average = (list) => (list.length ? Math.round(list.reduce((sum, n) => sum + n, 0) / list.length) : null);

/** One staff member's own history, grouped by day (newest first). */
export function getMyHistory(user) {
  const orders = getAllOrders();
  if (user.role === "staff") {
    const entries = orders.filter((o) => o.kitchenStaffId === user.id && cookedAt(o)).map(cookEntry);
    return {
      kind: "kitchen",
      totals: summarize(entries, "kitchen"),
      days: groupByDay(entries).map((day) => ({ ...day, summary: summarize(day.entries, "kitchen") })),
    };
  }
  const entries = orders.filter((o) => o.courierId === user.id && o.status === "delivered" && o.deliveredAt).map(deliveryEntry);
  return {
    kind: "delivery",
    totals: summarize(entries, "delivery"),
    days: groupByDay(entries).map((day) => ({ ...day, summary: summarize(day.entries, "delivery") })),
  };
}

// Average customer star rating (one decimal) and how many ratings it is based on.
function ratingSummary(entries) {
  const ratings = entries.map((e) => e.rating).filter(Boolean);
  return {
    rating: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null,
    ratingCount: ratings.length,
  };
}

function summarize(entries, kind) {
  if (kind === "kitchen") {
    return {
      orders: entries.length,
      items: entries.reduce((sum, e) => sum + e.itemCount, 0),
      avgMinutes: average(entries.map((e) => e.minutes).filter(Boolean)),
      ...ratingSummary(entries),
    };
  }
  return {
    orders: entries.length,
    fees: entries.reduce((sum, e) => sum + e.fee, 0),
    km: Math.round(entries.reduce((sum, e) => sum + (Number(e.km) || 0), 0) * 10) / 10,
    avgMinutes: average(entries.map((e) => e.minutes).filter(Boolean)),
    confirmed: entries.filter((e) => e.confirmed).length,
    ...ratingSummary(entries),
  };
}

/**
 * Rankings and the day-by-day ledger for the admin.
 * Cooks rank by orders finished (then faster average cooking time);
 * couriers by deliveries made (then faster average delivery time).
 */
export function getTeamPerformance(period = "7d") {
  const from = startDayFor(period);
  const orders = getAllOrders();

  const cooks = new Map();
  const couriers = new Map();
  const ledger = new Map();
  const dayOf = (day) => {
    if (!ledger.has(day)) ledger.set(day, { day, cooked: [], delivered: [] });
    return ledger.get(day);
  };

  for (const order of orders) {
    if (order.kitchenStaffId && cookedAt(order)) {
      const entry = cookEntry(order);
      if (entry.day >= from) {
        const cook = cooks.get(order.kitchenStaffId) || { id: order.kitchenStaffId, name: order.kitchenStaffName || "Cook", entries: [] };
        cook.entries.push(entry);
        cooks.set(order.kitchenStaffId, cook);
        dayOf(entry.day).cooked.push({ ...entry, by: cook.name, byId: cook.id });
      }
    }
    if (order.courierId && order.status === "delivered" && order.deliveredAt) {
      const entry = deliveryEntry(order);
      if (entry.day >= from) {
        const courier = couriers.get(order.courierId) || { id: order.courierId, name: order.courierName || "Courier", entries: [] };
        courier.entries.push(entry);
        couriers.set(order.courierId, courier);
        dayOf(entry.day).delivered.push({ ...entry, by: courier.name, byId: courier.id });
      }
    }
  }

  const rank = (list, kind) =>
    [...list.values()]
      .map(({ entries, ...person }) => ({ ...person, ...summarize(entries, kind) }))
      .sort((a, b) => b.orders - a.orders || (a.avgMinutes ?? 999) - (b.avgMinutes ?? 999) || a.name.localeCompare(b.name))
      .map((person, index) => ({ ...person, rank: index + 1 }));

  return {
    period,
    cooks: rank(cooks, "kitchen"),
    couriers: rank(couriers, "delivery"),
    days: [...ledger.values()]
      .sort((a, b) => b.day.localeCompare(a.day))
      .map((day) => ({
        ...day,
        cooked: day.cooked.sort((a, b) => String(b.at).localeCompare(String(a.at))),
        delivered: day.delivered.sort((a, b) => String(b.at).localeCompare(String(a.at))),
      })),
  };
}

/**
 * Cards for the team page: everyone currently on staff (even with no work in
 * the period) plus removed staff who still have work in it.
 * Returns { kitchen: [...], delivery: [...] }, best performers first.
 */
export function getTeamCards(period = "7d") {
  const performance = getTeamPerformance(period);
  const build = (role, ranked) => {
    const byId = new Map(ranked.map((person) => [person.id, person]));
    const current = listStaff(role);
    const cards = current.map((account) => ({
      id: account.id,
      name: account.name,
      photo: account.photo,
      phone: account.phone,
      removed: false,
      ...(byId.get(account.id) || { orders: 0, rank: null }),
    }));
    for (const person of ranked) {
      if (!current.some((account) => account.id === person.id)) {
        cards.push({ ...person, photo: "", phone: "", removed: true });
      }
    }
    return cards.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999) || a.name.localeCompare(b.name));
  };
  return { kitchen: build("staff", performance.cooks), delivery: build("delivery", performance.couriers) };
}

/**
 * The daily log for one team ("kitchen" or "delivery"): newest day first, each
 * with its entries (newest first), a summary and how much each person did.
 */
export function getTeamLog(team = "kitchen", period = "7d") {
  const kind = team === "delivery" ? "delivery" : "kitchen";
  const key = kind === "kitchen" ? "cooked" : "delivered";
  const days = getTeamPerformance(period)
    .days.map((day) => {
      const entries = day[key];
      const people = new Map();
      for (const entry of entries) {
        const person = people.get(entry.byId) || { id: entry.byId, name: entry.by, entries: [] };
        person.entries.push(entry);
        people.set(entry.byId, person);
      }
      return {
        day: day.day,
        entries,
        summary: summarize(entries, kind),
        people: [...people.values()]
          .map(({ entries: list, ...person }) => ({ ...person, ...summarize(list, kind) }))
          .sort((a, b) => b.orders - a.orders || a.name.localeCompare(b.name)),
      };
    })
    .filter((day) => day.entries.length > 0);
  return { kind, days, totals: summarize(days.flatMap((day) => day.entries), kind) };
}

/** Everything about one cook or courier for their profile page, or null. */
export function getPersonActivity(id) {
  const account = getAccount(id);
  const orders = getAllOrders();
  const cooked = orders.find((o) => o.kitchenStaffId === id);
  const delivered = orders.find((o) => o.courierId === id);
  const role = account && ["staff", "delivery"].includes(account.role) ? account.role : cooked ? "staff" : delivered ? "delivery" : null;
  if (!role) return null;

  const periods = Object.keys(PERIODS).map((period) => {
    const performance = getTeamPerformance(period);
    const list = role === "staff" ? performance.cooks : performance.couriers;
    const person = list.find((p) => p.id === id);
    return { period, label: PERIODS[period], rank: person?.rank ?? null, of: list.length, ...(person || { orders: 0 }) };
  });

  return {
    id,
    role,
    name: account?.name || (role === "staff" ? cooked?.kitchenStaffName : delivered?.courierName) || "Staff member",
    email: account?.email || "",
    phone: account?.phone || "",
    photo: account?.photo || "",
    joined: account?.createdAt || null,
    removed: !account,
    periods,
    history: getMyHistory({ id, role }),
  };
}
