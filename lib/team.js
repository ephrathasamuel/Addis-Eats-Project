import "server-only";
import { getAllOrders } from "@/lib/orders";
import { addisDay } from "@/lib/finances";

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
    items: (order.items || []).map((item) => `${item.qty}× ${item.name}`),
    itemCount: itemCount(order),
    minutes: Number(order.cookMinutes) || minutesBetween(order.cookingStartedAt, order.kitchenServedAt),
  };
}

function deliveryEntry(order) {
  return {
    orderId: order.id,
    day: addisDay(order.deliveredAt),
    at: order.deliveredAt,
    location: order.location,
    km: order.deliveryKm ?? order.driveEstimate?.km ?? null,
    fee: Number(order.deliveryFee) || 0,
    minutes: Number(order.deliveryDurationMinutes) || minutesBetween(order.deliveryStartedAt, order.deliveredAt),
    confirmed: Boolean(order.confirmedByCustomer),
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

function summarize(entries, kind) {
  if (kind === "kitchen") {
    return {
      orders: entries.length,
      items: entries.reduce((sum, e) => sum + e.itemCount, 0),
      avgMinutes: average(entries.map((e) => e.minutes).filter(Boolean)),
    };
  }
  return {
    orders: entries.length,
    fees: entries.reduce((sum, e) => sum + e.fee, 0),
    km: Math.round(entries.reduce((sum, e) => sum + (Number(e.km) || 0), 0) * 10) / 10,
    avgMinutes: average(entries.map((e) => e.minutes).filter(Boolean)),
    confirmed: entries.filter((e) => e.confirmed).length,
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
        dayOf(entry.day).cooked.push({ ...entry, by: cook.name });
      }
    }
    if (order.courierId && order.status === "delivered" && order.deliveredAt) {
      const entry = deliveryEntry(order);
      if (entry.day >= from) {
        const courier = couriers.get(order.courierId) || { id: order.courierId, name: order.courierName || "Courier", entries: [] };
        courier.entries.push(entry);
        couriers.set(order.courierId, courier);
        dayOf(entry.day).delivered.push({ ...entry, by: courier.name });
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
