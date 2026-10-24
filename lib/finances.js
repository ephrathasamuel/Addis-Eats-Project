// Daily expenses and the income/expense ledger for the admin panel.
// Everything here comes from real data: orders placed through the app and
// costs entered by the admin. Nothing is estimated or invented.
import "server-only";
import { readJson, storeGeneration, writeJson } from "@/lib/datastore";

const STORE = "expenses.json";
const ADDIS_OFFSET_MS = 3 * 60 * 60 * 1000; // Addis Ababa is UTC+3 all year

/** Calendar day (YYYY-MM-DD) in Addis Ababa time. */
export function addisDay(value = Date.now()) {
  const ms = typeof value === "number" ? value : new Date(value).getTime();
  return new Date(ms + ADDIS_OFFSET_MS).toISOString().slice(0, 10);
}

// Reloads whenever fresh data has been synced from the database.
function getExpenses() {
  if (globalThis.__addis_expenses && globalThis.__addis_expenses_generation === storeGeneration()) {
    return globalThis.__addis_expenses;
  }
  globalThis.__addis_expenses = new Map();
  globalThis.__addis_expenses_generation = storeGeneration();
  const saved = readJson(STORE, []);
  for (const item of Array.isArray(saved) ? saved : []) {
    if (item?.date) globalThis.__addis_expenses.set(item.date, item);
  }
  return globalThis.__addis_expenses;
}

export function getExpense(date) {
  return getExpenses().get(date) || null;
}

/**
 * Records the costs for a day, any day in the past included. Changing a day
 * that already has costs needs a reason; the previous values are kept in the
 * day's history with who changed them, when and why.
 * Returns { ok, record, edited } or { ok: false, error, needsReason }.
 */
export function saveDailyExpense({ date, rawMaterials, transport, note = "", reason = "", by = "Admin" }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))) return { ok: false, error: "Choose a date." };
  if (date > addisDay()) return { ok: false, error: "You can't enter costs for a future date." };
  const expenses = getExpenses();
  const existing = expenses.get(date);
  const values = {
    rawMaterials: Math.max(0, Number(rawMaterials) || 0),
    transport: Math.max(0, Number(transport) || 0),
    note: String(note || "").trim().slice(0, 300),
  };
  const now = new Date().toISOString();

  if (existing) {
    const unchanged =
      Number(existing.rawMaterials) === values.rawMaterials &&
      Number(existing.transport) === values.transport &&
      String(existing.note || "") === values.note;
    if (unchanged) return { ok: true, record: existing, edited: false };
    const why = String(reason || "").trim().slice(0, 300);
    if (!why) {
      return { ok: false, needsReason: true, error: `Costs for ${date} are already recorded. Add a reason for the change.` };
    }
    const record = {
      ...existing,
      ...values,
      updatedAt: now,
      updatedBy: by,
      history: [
        ...(existing.history || []),
        {
          rawMaterials: Number(existing.rawMaterials) || 0,
          transport: Number(existing.transport) || 0,
          note: existing.note || "",
          replacedAt: now,
          replacedBy: by,
          reason: why,
        },
      ],
    };
    expenses.set(date, record);
    writeJson(STORE, [...expenses.values()]);
    return { ok: true, record, edited: true };
  }

  const record = { id: `exp_${date}`, date, ...values, createdAt: now, createdBy: by, history: [] };
  expenses.set(date, record);
  writeJson(STORE, [...expenses.values()]);
  return { ok: true, record, edited: false };
}

export function getAllExpenses() {
  return [...getExpenses().values()].sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * One row per day: real revenue, orders and items from the orders placed that
 * day (Addis Ababa time, cancelled orders excluded), and the costs entered
 * for that day. Covers every day with orders or costs, plus the last 7 days.
 */
export function getFinancialLedger(ordersList = []) {
  const byDay = new Map();
  const dayRow = (date) => {
    if (!byDay.has(date)) byDay.set(date, { revenue: 0, deliveryFees: 0, ordersCount: 0, itemsSold: 0 });
    return byDay.get(date);
  };

  for (const order of ordersList) {
    if (order.status === "cancelled" || order.status === "awaiting-payment" || !order.createdAt) continue;
    const row = dayRow(addisDay(order.createdAt));
    row.revenue += Number(order.total) || 0;
    row.deliveryFees += Number(order.deliveryFee) || 0;
    row.ordersCount += 1;
    row.itemsSold += (order.items || []).reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  }

  const dates = new Set([...byDay.keys(), ...getExpenses().keys()]);
  for (let i = 0; i < 7; i++) dates.add(addisDay(Date.now() - i * 24 * 60 * 60 * 1000));

  const ledger = [...dates]
    .sort((a, b) => b.localeCompare(a))
    .map((date) => {
      const sales = byDay.get(date) || { revenue: 0, deliveryFees: 0, ordersCount: 0, itemsSold: 0 };
      const expense = getExpenses().get(date);
      const rawMaterials = Number(expense?.rawMaterials) || 0;
      const transport = Number(expense?.transport) || 0;
      const totalExpenses = rawMaterials + transport;
      const netProfit = sales.revenue - totalExpenses;
      return {
        date,
        ...sales,
        rawMaterials,
        transport,
        totalExpenses,
        netProfit,
        margin: sales.revenue > 0 ? ((netProfit / sales.revenue) * 100).toFixed(1) : "0.0",
        costsRecorded: Boolean(expense),
        note: expense?.note || "",
        updatedAt: expense?.updatedAt || null,
        updatedBy: expense?.updatedBy || null,
        history: expense?.history || [],
      };
    });

  const totals = ledger.reduce(
    (acc, row) => ({
      revenue: acc.revenue + row.revenue,
      rawMaterials: acc.rawMaterials + row.rawMaterials,
      transport: acc.transport + row.transport,
      totalExpenses: acc.totalExpenses + row.totalExpenses,
      netProfit: acc.netProfit + row.netProfit,
      itemsSold: acc.itemsSold + row.itemsSold,
      ordersCount: acc.ordersCount + row.ordersCount,
    }),
    { revenue: 0, rawMaterials: 0, transport: 0, totalExpenses: 0, netProfit: 0, itemsSold: 0, ordersCount: 0 }
  );

  return {
    ledger,
    recent5Days: ledger.slice(0, 5),
    totals: {
      ...totals,
      margin: totals.revenue > 0 ? ((totals.netProfit / totals.revenue) * 100).toFixed(1) : "0.0",
    },
  };
}
