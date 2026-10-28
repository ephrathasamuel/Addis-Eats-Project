import "server-only";
import crypto from "node:crypto";
import { readJson, storeGeneration, takeLock, writeJson } from "@/lib/datastore";
import { addDishReview, changeDishReview, getDishExact, recordDishOrders } from "./dishes";
import { getAccount } from "./accounts";
import { getSettings } from "./settings";
import { DELIVERY_LOCATIONS, getLocationDriveTime, getLocationFee } from "./locations";

export { DELIVERY_LOCATIONS, getLocationDriveTime, getLocationFee };

const STORE = "orders.json";
const MAX_QTY_PER_ITEM = 50;

function loadFromDisk() {
  const list = readJson(STORE, null);
  if (list === null) return;
  if (!Array.isArray(list)) {
    console.warn("[addis-eats] Orders store is not an array; ignoring it.");
    return;
  }
  for (const item of list) {
    if (item?.id) {
      orders.set(String(item.id), item);
      const numId = Number(item.id);
      if (!isNaN(numId) && numId >= globalThis.__addis_order_counter) {
        globalThis.__addis_order_counter = numId + 1;
      }
    }
  }
}

function saveToDisk() {
  writeJson(STORE, Array.from(orders.values()));
}

// Order database. Starts empty: only real orders are stored (no demo data).
if (!globalThis.__addis_orders) {
  globalThis.__addis_orders = new Map();
  // Order numbers continue from the highest stored order (see loadFromDisk).
  globalThis.__addis_order_counter = 1001;
}

const orders = globalThis.__addis_orders;
loadFromDisk();

const READY_TICKET_WINDOW_MS = 2 * 60 * 60 * 1000;

function timeOf(value) {
  const ms = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(ms) ? ms : 0;
}

function minutesSince(startIso, now = Date.now()) {
  return Math.max(1, Math.round((now - timeOf(startIso)) / 60000));
}

function summarizeItems(items) {
  return (items || []).map(({ id, name, qty, price, image }) => ({ id, name, qty, price, image }));
}

/**
 * Re-prices a cart against the live menu. Prices, names and availability
 * always come from the server-side dish store, never from the browser.
 * Returns { ok, items, foodTotal } or { ok: false, error }.
 */
export function priceOrderItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { ok: false, error: "Your cart is empty." };
  }
  const merged = new Map();
  for (const raw of rawItems) {
    const qty = Number(raw?.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_ITEM) {
      return { ok: false, error: `Each item quantity must be between 1 and ${MAX_QTY_PER_ITEM}.` };
    }
    const dish = getDishExact(raw?.id);
    if (!dish || dish.isRemoved) {
      return { ok: false, error: `"${raw?.name || raw?.id || "An item"}" is no longer on the menu. Please update your cart.` };
    }
    if (dish.isSoldOut) {
      return { ok: false, error: `"${dish.name}" just sold out. Please remove it from your cart.` };
    }
    const previousQty = merged.get(dish.id)?.qty || 0;
    merged.set(dish.id, {
      id: dish.id,
      name: dish.name,
      price: dish.price,
      image: dish.image,
      category: dish.category,
      qty: Math.min(MAX_QTY_PER_ITEM, previousQty + qty),
    });
  }
  const items = [...merged.values()];
  const foodTotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  return { ok: true, items, foodTotal };
}

export function createOrder({
  userId,
  name,
  phone,
  items,
  foodTotal,
  location = "Bole",
  addressDetails = "",
  deliveryCoordinates = null,
  driveEstimate = null,
  quote = null,
  id: reservedId = null,
  payOnline = false,
}) {
  loadFromDisk();
  const id = reservedId ? String(reservedId) : String(globalThis.__addis_order_counter++);
  // Distance-based fee worked out by lib/pricing (falls back to the area fee).
  const deliveryFee = quote?.fee ?? getLocationFee(location);
  const order = {
    id,
    userId,
    name,
    phone,
    items,
    foodTotal,
    deliveryFee,
    total: foodTotal + deliveryFee,
    location,
    addressDetails,
    estimatedEta: getLocationDriveTime(location),
    deliveryCoordinates,
    driveEstimate,
    deliveryKm: quote?.km ?? null,
    deliveryFeeBasis: quote?.basis ?? "area",
    kitchenEstimate: getKitchenEstimate(items),
    // Orders paid online wait outside the kitchen until the payment is confirmed.
    status: payOnline ? "awaiting-payment" : "placed",
    payment: payOnline ? { method: "online", status: "pending", references: [] } : { method: "cash" },
    // The customer gives this to the courier at the door (see completeDelivery).
    deliveryCode: String(crypto.randomInt(0, 10000)).padStart(4, "0"),
    confirmedByCustomer: false,
    reviewed: false,
    createdAt: new Date().toISOString(),
  };
  orders.set(id, order);
  saveToDisk();
  // Dish popularity counts only orders the kitchen will actually cook.
  if (!payOnline) recordDishOrders(items);
  return order;
}

/** The next free order number. A number is never handed out twice, even by two servers. */
export function nextOrderNumber() {
  loadFromDisk();
  let next = globalThis.__addis_order_counter;
  while (orders.has(String(next))) next++;
  globalThis.__addis_order_counter = next + 1;
  return String(next);
}

export function getOrder(id) {
  // Pick up changes synced from the database (e.g. a claim made on another server).
  if (globalThis.__addis_orders_generation !== storeGeneration()) {
    globalThis.__addis_orders_generation = storeGeneration();
    loadFromDisk();
  }
  let order = orders.get(String(id));
  if (!order) {
    loadFromDisk();
    order = orders.get(String(id));
  }
  if (!order) return null;
  return { ...order };
}

export function getOrderForUser(id, userId, role = "customer") {
  if (!userId) return null;
  const order = getOrder(id);
  if (!order) return null;
  if (role === "admin") return order;
  if (role === "delivery") {
    return String(order.courierId) === String(userId) ? order : null;
  }
  if (role !== "customer") return null;
  return String(order.userId) === String(userId) ? order : null;
}

// Courier details a customer sees once their order has been picked up.
// Shown from the moment a courier accepts the order (status "served" with a
// courier) so the customer can call them while they pick it up.
export function getCourierProfile(order) {
  if (!order?.courierId || !["served", "on-the-way", "delivered"].includes(order.status)) return null;
  const account = getAccount(order.courierId);
  return {
    name: account?.name || order.courierName || "Courier",
    phone: account?.phone || order.courierPhone || "",
    photo: account?.photo || order.courierPhoto || "",
  };
}

export function toOrderClientData(order) {
  if (!order) return null;
  const clientData = { ...order };
  delete clientData.userId;
  delete clientData.ownerToken;
  clientData.courier = getCourierProfile(order);
  return clientData;
}

export function toOrderTrackingData(order) {
  if (!order) return null;
  return {
    id: order.id,
    name: order.name,
    status: order.status,
    createdAt: order.createdAt,
    location: order.location,
    addressDetails: order.addressDetails || "",
    deliveryCoordinates: order.deliveryCoordinates || null,
    courierLocation: order.courierLocation || null,
    courier: getCourierProfile(order),
    estimatedEta: order.estimatedEta || null,
    total: order.total,
    items: summarizeItems(order.items),
  };
}

export function getOrdersFor(userId) {
  if (!userId) return [];
  return getAllOrders()
    .filter((order) => order.userId === userId)
    .map(toOrderClientData);
}

export function getAllOrders() {
  loadFromDisk();
  return [...orders.values()].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
}

// ---------------------------------------------------------------------------
// Kitchen
// ---------------------------------------------------------------------------

// Tickets never include customer identity, phone or address.
function toKitchenTicket(order) {
  return {
    id: order.id,
    status: order.status,
    createdAt: order.createdAt,
    items: summarizeItems(order.items),
    kitchenStaffId: order.kitchenStaffId || null,
    kitchenStaffName: order.kitchenStaffName || null,
    cookingStartedAt: order.cookingStartedAt || null,
    kitchenServedAt: order.kitchenServedAt || null,
  };
}

// Waiting + cooking tickets, plus tickets finished in the last two hours.
export function getKitchenQueue() {
  const now = Date.now();
  return getAllOrders()
    .filter((order) => (order.items || []).length > 0)
    .filter(
      (order) =>
        order.status === "placed" ||
        order.status === "preparing" ||
        (order.status === "served" && now - timeOf(order.kitchenServedAt || order.createdAt) < READY_TICKET_WINDOW_MS)
    )
    .map(toKitchenTicket)
    .sort((a, b) => timeOf(a.createdAt) - timeOf(b.createdAt));
}

/**
 * Assigns waiting tickets to a cook. Runs synchronously, so two tablets
 * claiming the same ticket at once cannot both win.
 * Returns one { id, ok, error? } per requested ticket.
 */
export function claimKitchenOrders(orderIds, cook) {
  loadFromDisk();
  const now = new Date().toISOString();
  const results = [];
  for (const rawId of orderIds) {
    const id = String(rawId);
    const order = orders.get(id);
    if (!order) {
      results.push({ id, ok: false, error: "Order not found." });
    } else if (order.status !== "placed" || order.kitchenStaffId) {
      results.push({
        id,
        ok: false,
        error: order.kitchenStaffName ? `Already claimed by ${order.kitchenStaffName}.` : "No longer waiting.",
      });
    } else {
      order.status = "preparing";
      order.kitchenStaffId = cook.id;
      order.kitchenStaffName = cook.name;
      order.cookingStartedAt = now;
      results.push({ id, ok: true });
    }
  }
  if (results.some((result) => result.ok)) saveToDisk();
  return results;
}

// Puts a cooking ticket back in the waiting queue (claimed by mistake).
export function releaseKitchenOrder(rawId) {
  loadFromDisk();
  const order = orders.get(String(rawId));
  if (!order || order.status !== "preparing") {
    return { ok: false, error: "Only tickets that are cooking can be released." };
  }
  order.status = "placed";
  delete order.kitchenStaffId;
  delete order.kitchenStaffName;
  delete order.cookingStartedAt;
  saveToDisk();
  return { ok: true };
}

// Marks cooking tickets ready for couriers. Credit stays with the cook who claimed them.
export function markKitchenReady(orderIds) {
  loadFromDisk();
  const nowMs = Date.now();
  const now = new Date(nowMs).toISOString();
  const results = [];
  for (const rawId of orderIds) {
    const id = String(rawId);
    const order = orders.get(id);
    if (!order || order.status !== "preparing") {
      results.push({ id, ok: false, error: "Only tickets that are cooking can be marked ready." });
      continue;
    }
    order.status = "served";
    order.kitchenServedAt = now;
    order.kitchenDurationMinutes = minutesSince(order.createdAt, nowMs);
    order.cookMinutes = minutesSince(order.cookingStartedAt || order.createdAt, nowMs);
    results.push({ id, ok: true });
  }
  if (results.some((result) => result.ok)) saveToDisk();
  return results;
}

/**
 * Per-person performance counts since a point in time.
 * cooks:    { [staffId]: { name, done, cooking, items, avgCookMinutes } }
 * couriers: { [courierId]: { name, delivered, active, fees } }
 */
export function getStaffStats(since = null) {
  loadFromDisk();
  const sinceMs = since ? since.getTime() : 0;
  const cooks = {};
  const couriers = {};

  for (const order of orders.values()) {
    if (order.kitchenStaffId) {
      const cook = (cooks[order.kitchenStaffId] ||= { name: order.kitchenStaffName, done: 0, cooking: 0, items: 0, cookMinutes: 0 });
      if (order.status === "preparing") {
        cook.cooking += 1;
      } else if (["served", "on-the-way", "delivered"].includes(order.status) && timeOf(order.kitchenServedAt) >= sinceMs) {
        cook.done += 1;
        cook.items += (order.items || []).reduce((sum, item) => sum + (Number(item.qty) || 1), 0);
        cook.cookMinutes += Number(order.cookMinutes) || 0;
      }
    }
    if (order.courierId) {
      const courier = (couriers[order.courierId] ||= { name: order.courierName, delivered: 0, active: 0, fees: 0 });
      if (order.status === "on-the-way" || order.status === "served") {
        courier.active += 1;
      } else if (order.status === "delivered" && timeOf(order.deliveredAt) >= sinceMs) {
        courier.delivered += 1;
        courier.fees += Number(order.deliveryFee) || 0;
      }
    }
  }

  for (const cook of Object.values(cooks)) {
    cook.avgCookMinutes = cook.done ? Math.round(cook.cookMinutes / cook.done) : null;
    delete cook.cookMinutes;
  }
  return { cooks, couriers };
}

/**
 * Kitchen time estimate from real cooking times. Every finished ticket records
 * how long it took from claim to ready (cookMinutes); each dish gets the
 * average across all cooks of the tickets it appeared in. Dishes cook in
 * parallel, so an order's estimate is its slowest dish.
 * Returns { minutes, samples, basis: "dishes" | "kitchen" | "default" }.
 */
export function getKitchenEstimate(items) {
  loadFromDisk();
  const perDish = new Map();
  const all = [];
  for (const order of orders.values()) {
    const minutes = Number(order.cookMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 240) continue;
    all.push(minutes);
    for (const item of order.items || []) {
      if (!perDish.has(item.id)) perDish.set(item.id, []);
      perDish.get(item.id).push(minutes);
    }
  }
  const average = (list) => list.reduce((sum, m) => sum + m, 0) / list.length;
  const dishAverages = (items || [])
    .map((item) => perDish.get(item.id))
    .filter((list) => list && list.length > 0);
  if (dishAverages.length > 0) {
    return {
      minutes: Math.max(5, Math.round(Math.max(...dishAverages.map(average)))),
      samples: dishAverages.reduce((sum, list) => sum + list.length, 0),
      basis: "dishes",
    };
  }
  if (all.length > 0) return { minutes: Math.max(5, Math.round(average(all))), samples: all.length, basis: "kitchen" };
  return { minutes: 15, samples: 0, basis: "default" };
}

export function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

// ---------------------------------------------------------------------------
// Delivery
// ---------------------------------------------------------------------------

export function getDeliveryOrdersFor(courierId, isAdmin = false) {
  const scopedOrders = isAdmin
    ? getAllOrders().filter((order) => ["served", "on-the-way", "delivered"].includes(order.status) && (order.items || []).length > 0)
    : getAllOrders().filter((order) =>
        (order.status === "served" && !order.courierId && (order.items || []).length > 0) ||
        (String(order.courierId) === String(courierId) &&
          ["served", "on-the-way", "delivered"].includes(order.status))
      );

  if (isAdmin) return scopedOrders.map(toOrderClientData);
  return scopedOrders.map((order) => {
    const assignedToCourier = String(order.courierId) === String(courierId);
    return {
      id: order.id,
      status: order.status,
      createdAt: order.createdAt,
      kitchenServedAt: order.kitchenServedAt || null,
      location: order.location,
      estimatedEta: order.estimatedEta,
      hasMapPin: Boolean(order.deliveryCoordinates),
      // Whether the courier must type the customer's code (never the code itself).
      needsDeliveryCode: Boolean(order.deliveryCode) && getSettings().requireDeliveryCode !== false,
      paidOnline: order.payment?.status === "paid",
      items: summarizeItems(order.items),
      deliveryFee: order.deliveryFee,
      foodTotal: order.foodTotal,
      total: order.total,
      courierId: assignedToCourier ? order.courierId : null,
      courierName: assignedToCourier ? order.courierName : null,
      deliveryStartedAt: assignedToCourier ? order.deliveryStartedAt : null,
      courierAcceptedAt: assignedToCourier ? order.courierAcceptedAt || null : null,
      driveEstimate: order.driveEstimate || null,
      deliveredAt: assignedToCourier ? order.deliveredAt : null,
      deliveryDurationMinutes: assignedToCourier ? order.deliveryDurationMinutes : null,
      confirmedByCustomer: assignedToCourier ? Boolean(order.confirmedByCustomer) : false,
      receivedAt: assignedToCourier ? order.receivedAt : null,
      ...(assignedToCourier ? {
        name: order.name,
        phone: order.phone,
        addressDetails: order.addressDetails || "",
        deliveryCoordinates: order.deliveryCoordinates || null,
        adminEdited: order.adminEdited,
        adminEditedBy: order.adminEditedBy,
        adminEditNote: order.adminEditNote,
      } : {}),
    };
  });
}

const UNCLAIM_WINDOW_MS = 5 * 60 * 1000;
// About 5 minutes' drive in city traffic, as a straight-line distance.
const NEARBY_KM = 2.5;

function distanceKm(a, b) {
  const rad = (deg) => (deg * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

// Two drop-offs can share one trip when they are in the same neighborhood,
// or both have map pins within about 5 minutes of each other.
function closeEnough(a, b) {
  if (String(a.location || "").trim().toLowerCase() === String(b.location || "").trim().toLowerCase()) return true;
  if (a.deliveryCoordinates && b.deliveryCoordinates) {
    return distanceKm(a.deliveryCoordinates, b.deliveryCoordinates) <= NEARBY_KM;
  }
  return false;
}

/**
 * A courier accepts an order from the pool. The journey has not started yet:
 * the courier can still hand it back for 5 minutes, then taps Start journey.
 * A courier holding other orders may only add one that is close to them.
 */
export function claimAndStartDelivery(id, courier) {
  getOrder(id);
  const order = orders.get(String(id));
  if (!order) return { ok: false, error: "Order not found." };
  if (order.status !== "served" || order.courierId) {
    return { ok: false, error: "Another courier already took this order." };
  }
  const holding = [...orders.values()].filter(
    (other) => other.courierId === courier.id && ["served", "on-the-way"].includes(other.status)
  );
  const far = holding.find((other) => !closeEnough(other, order));
  if (far) {
    return {
      ok: false,
      error: `You already have order #${far.id} to ${far.location}. You can only take another order in the same area (within about 5 minutes of it).`,
    };
  }
  order.courierId = courier.id;
  order.courierName = courier.name || "Courier";
  order.courierPhone = courier.phone || "";
  // A link is cheap to keep; a whole inline picture would be copied into every
  // order. The courier card reads the photo from their account anyway.
  order.courierPhoto = courier.photo && !String(courier.photo).startsWith("data:") ? courier.photo : "";
  order.courierAcceptedAt = new Date().toISOString();
  saveToDisk();
  return { ok: true, order: { ...order } };
}

// The courier picked the food up and is setting off.
export function startDeliveryJourney(id, courierId) {
  getOrder(id);
  const order = orders.get(String(id));
  if (!order || order.status !== "served" || order.courierId !== courierId) {
    return { ok: false, error: "This order isn't waiting for you to start." };
  }
  order.status = "on-the-way";
  order.deliveryStartedAt = new Date().toISOString();
  saveToDisk();
  return { ok: true, order: { ...order } };
}

// Hand an accepted order back to the pool, within 5 minutes and before the journey starts.
export function releaseDelivery(id, courierId) {
  getOrder(id);
  const order = orders.get(String(id));
  if (!order || order.courierId !== courierId) return { ok: false, error: "This order isn't assigned to you." };
  if (order.status !== "served") {
    return { ok: false, error: "You've already started this journey, so it can't be handed back." };
  }
  if (Date.now() - new Date(order.courierAcceptedAt || 0).getTime() > UNCLAIM_WINDOW_MS) {
    return { ok: false, error: "Orders can only be handed back within 5 minutes of accepting them." };
  }
  for (const key of ["courierId", "courierName", "courierPhone", "courierPhoto", "courierAcceptedAt"]) delete order[key];
  saveToDisk();
  return { ok: true };
}

const MAX_CODE_TRIES = 5;

export function completeDelivery(id, courierId, code) {
  getOrder(id);
  const order = orders.get(String(id));
  if (!order) return { ok: false, error: "Order not found." };
  if (order.status !== "on-the-way" || !courierId || order.courierId !== courierId) {
    return { ok: false, error: "Only the assigned courier can mark this order as delivered." };
  }
  // Orders from before delivery codes existed, or with the check turned off
  // by the admin, are completed as before.
  if (order.deliveryCode && getSettings().requireDeliveryCode !== false) {
    if ((order.deliveryCodeTries || 0) >= MAX_CODE_TRIES) {
      return { ok: false, error: "Too many wrong codes. Call the restaurant to confirm this delivery." };
    }
    if (String(code || "").trim() !== order.deliveryCode) {
      order.deliveryCodeTries = (order.deliveryCodeTries || 0) + 1;
      saveToDisk();
      return {
        ok: false,
        codeError: true,
        error: code
          ? "That code doesn't match. Ask the customer for the 4-digit code on their order page."
          : "Enter the customer's 4-digit delivery code.",
      };
    }
  }
  const nowMs = Date.now();
  order.status = "delivered";
  order.deliveredAt = new Date(nowMs).toISOString();
  order.deliveryDurationMinutes = minutesSince(order.deliveryStartedAt || order.kitchenServedAt || order.createdAt, nowMs);
  order.totalDurationMinutes = minutesSince(order.createdAt, nowMs);
  saveToDisk();
  return { ok: true, order: { ...order } };
}

export function updateCourierLocation(id, courierId, latitude, longitude) {
  getOrder(id);
  const order = orders.get(String(id));
  if (!order || order.status !== "on-the-way" || order.courierId !== courierId) {
    return { ok: false, error: "Active delivery assignment not found." };
  }
  if (
    order.courierLocation?.updatedAt &&
    Date.now() - new Date(order.courierLocation.updatedAt).getTime() < 5000
  ) {
    return { ok: false, status: 429, error: "Please wait before sending another location update." };
  }
  order.courierLocation = {
    latitude,
    longitude,
    updatedAt: new Date().toISOString(),
  };
  saveToDisk();
  return { ok: true };
}

export function confirmOrderReceived(id) {
  getOrder(id);
  const order = orders.get(String(id));
  if (!order || order.status !== "delivered") return null;
  order.confirmedByCustomer = true;
  if (!order.receivedAt) {
    const nowMs = Date.now();
    order.receivedAt = new Date(nowMs).toISOString();
    order.totalDoorToDoorMinutes = minutesSince(order.createdAt, nowMs);
  }
  saveToDisk();
  return { ...order };
}

export function adminEditOrderRecord(id, { phone, location, note, quote }, adminName) {
  getOrder(id);
  const order = orders.get(String(id));
  if (!order) return { ok: false, error: "Order not found." };
  if (phone) {
    order.phone = String(phone).trim();
  }
  if (location) {
    order.location = String(location).trim();
    const newFee = quote?.fee ?? getLocationFee(order.location);
    order.deliveryFee = newFee;
    order.deliveryKm = quote?.km ?? null;
    order.deliveryFeeBasis = quote?.basis ?? "area";
    order.estimatedEta = getLocationDriveTime(order.location);
    order.total = (order.foodTotal || 0) + newFee;
  }
  order.adminEdited = true;
  order.adminEditedBy = adminName || "Administrator";
  order.adminEditedAt = new Date().toISOString();
  order.adminEditNote = note ? String(note).trim() : "Details updated by administrator";
  saveToDisk();
  return { ok: true, order: { ...order } };
}

export function submitOrderReview(id, rating, comment) {
  getOrder(id);
  const order = orders.get(String(id));
  if (!order || order.status !== "delivered" || order.reviewed) return null;
  order.reviewed = true;
  order.reviewRating = Number(rating) || 5;
  order.reviewComment = comment || "";
  order.reviewedAt = new Date().toISOString();

  if (Array.isArray(order.items)) {
    order.items.forEach((item) => {
      addDishReview(item.id || item.name, rating, comment);
    });
  }
  saveToDisk();
  return { ...order };
}

export const REVIEW_EDIT_WINDOW_MS = 48 * 60 * 60 * 1000;

/**
 * Lets a customer change their review within 48 hours of first posting it.
 * The first version is kept as originalReview; later edits replace the current one.
 * Returns { ok, order } or { ok: false, error }.
 */
export function editOrderReview(id, rating, comment) {
  getOrder(id);
  const order = orders.get(String(id));
  if (!order || !order.reviewed) return { ok: false, error: "There is no review to edit yet." };
  // Reviews posted before reviewedAt was recorded count from receipt/delivery.
  const postedAt = order.reviewedAt || order.receivedAt || order.deliveredAt;
  if (!postedAt || Date.now() - new Date(postedAt).getTime() > REVIEW_EDIT_WINDOW_MS) {
    return { ok: false, error: "Reviews can only be edited within 48 hours of posting them." };
  }
  if (!order.reviewedAt) order.reviewedAt = postedAt;
  if (!order.originalReview) {
    order.originalReview = { rating: order.reviewRating, comment: order.reviewComment, createdAt: order.reviewedAt };
  }
  const previousRating = order.reviewRating;
  order.reviewRating = Number(rating);
  order.reviewComment = comment || "";
  order.reviewEditedAt = new Date().toISOString();
  for (const item of order.items || []) {
    changeDishReview(item.id || item.name, previousRating, order.reviewRating, order.reviewComment);
  }
  saveToDisk();
  return { ok: true, order: { ...order } };
}

export function cancelOrderRecord(id, userId) {
  getOrder(id);
  const order = orders.get(String(id));
  if (!order) {
    return { ok: false, status: 404, error: "Order not found." };
  }
  if (order.userId !== userId) {
    return { ok: false, status: 403, error: "Not yours: you do not own this order." };
  }
  // Not paid yet: nothing to refund, so it can always be cancelled.
  if (order.status === "awaiting-payment") {
    order.status = "cancelled";
    order.cancelledAt = new Date().toISOString();
    saveToDisk();
    return { ok: true, order: { ...order } };
  }
  if (order.payment?.status === "paid") {
    return { ok: false, status: 400, error: "This order was paid online, so please call us to cancel it and arrange a refund." };
  }
  const ageMs = Date.now() - new Date(order.paidAt || order.createdAt).getTime();
  if (order.status !== "placed" || ageMs > 5 * 60 * 1000) {
    return { ok: false, status: 400, error: "Orders can only be cancelled within 5 minutes and before the kitchen starts cooking." };
  }
  order.status = "cancelled";
  order.cancelledAt = new Date().toISOString();
  saveToDisk();
  return { ok: true, order: { ...order } };
}

/**
 * Calculates real revenue, item sold counts, and order statistics from all orders
 */
export function getRealRevenueStats() {
  let totalRevenue = 0;
  let totalItemsSold = 0;
  let activeOrders = 0;
  let deliveredOrders = 0;

  for (const order of orders.values()) {
    if (order.status === "cancelled") continue;
    totalRevenue += Number(order.total) || 0;
    if (order.status === "delivered") {
      deliveredOrders += 1;
    } else {
      activeOrders += 1;
    }
    if (Array.isArray(order.items)) {
      for (const item of order.items) {
        totalItemsSold += Number(item.qty) || 1;
      }
    }
  }

  return {
    totalRevenue,
    totalItemsSold,
    totalOrders: orders.size,
    activeOrders,
    deliveredOrders,
  };
}

/**
 * Ranks most bought dishes with their respective delivery locations
 */
export function getDishPopularityByLocation() {
  const dishMap = new Map();

  for (const order of orders.values()) {
    if (order.status === "cancelled") continue;
    const loc = order.location || "Bole";

    if (Array.isArray(order.items)) {
      for (const item of order.items) {
        const key = item.id || item.name;
        if (!dishMap.has(key)) {
          dishMap.set(key, {
            id: item.id || key,
            name: item.name,
            price: item.price,
            image: item.image,
            totalOrders: 0,
            totalUnits: 0,
            totalRevenue: 0,
            locationCounts: {},
          });
        }

        const data = dishMap.get(key);
        const qty = Number(item.qty) || 1;
        data.totalOrders += 1;
        data.totalUnits += qty;
        data.totalRevenue += (Number(item.price) || 0) * qty;
        data.locationCounts[loc] = (data.locationCounts[loc] || 0) + qty;
      }
    }
  }

  // Convert location counts to sorted array of { location, count }
  const ranked = [...dishMap.values()].map((d) => {
    const topLocations = Object.entries(d.locationCounts)
      .map(([loc, count]) => ({ location: loc, count }))
      .sort((a, b) => b.count - a.count);

    return {
      ...d,
      topLocations,
    };
  });

  return ranked.sort((a, b) => b.totalUnits - a.totalUnits);
}

const NEIGHBOURHOODS = ["Bole", "Kazanchis", "Piassa", "Sarbet", "CMC", "Kirkos"];

/**
 * Aggregates revenue and volume metrics on the server for the dashboard
 */
export function getDashboardMetrics() {
  const all = [...orders.values()];

  // 1. Revenue by neighbourhood
  const neighbourhoodRev = {};
  NEIGHBOURHOODS.forEach((n) => (neighbourhoodRev[n] = 0));
  all.forEach((o) => {
    const n = o.neighbourhood || o.location || "Bole";
    neighbourhoodRev[n] = (neighbourhoodRev[n] || 0) + (Number(o.total) || 0);
  });

  const revenueByNeighbourhood = Object.entries(neighbourhoodRev).map(([name, revenue]) => ({
    neighbourhood: name,
    revenue,
  }));

  // 2. Orders per day over past 7 days
  const dayCounts = {};
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    const key = d.toISOString().split("T")[0]; // YYYY-MM-DD
    dayCounts[key] = 0;
  }

  all.forEach((o) => {
    if (o.createdAt) {
      const dateKey = o.createdAt.split("T")[0];
      if (dayCounts[dateKey] !== undefined) {
        dayCounts[dateKey] += 1;
      }
    }
  });

  const ordersOverTime = Object.entries(dayCounts).map(([date, count]) => {
    const d = new Date(date + "T00:00:00Z");
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return { date, label, count };
  });

  // 3. Totals
  const totalRevenue = all.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const totalOrders = all.length;
  const averageOrderValue = Math.round(totalRevenue / (totalOrders || 1));

  return {
    revenueByNeighbourhood,
    ordersOverTime,
    totalRevenue,
    totalOrders,
    averageOrderValue,
  };
}

// ---------------------------------------------------------------------------
// Customer problem reports ("Something wrong with this order?")
// ---------------------------------------------------------------------------

export const PROBLEM_TYPES = {
  missing: "Something was missing",
  wrong: "Wrong dish",
  quality: "Cold, spilled or damaged",
  late: "Arrived very late",
  courier: "Problem with the courier",
  other: "Something else",
};
const PROBLEM_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function reportOrderProblem(id, userId, { type, note } = {}) {
  getOrder(id);
  const order = orders.get(String(id));
  if (!order || String(order.userId) !== String(userId)) return { ok: false, error: "Order not found." };
  if (order.status !== "delivered") return { ok: false, error: "You can report a problem once the order has been delivered." };
  const since = new Date(order.deliveredAt || order.createdAt).getTime();
  if (Date.now() - since > PROBLEM_WINDOW_MS) {
    return { ok: false, error: "Problems can be reported up to 7 days after delivery. Please call us instead." };
  }
  if (!PROBLEM_TYPES[type]) return { ok: false, error: "Choose what went wrong." };
  const text = String(note || "").trim().slice(0, 500);
  if (type === "other" && text.length < 3) return { ok: false, error: "Tell us briefly what went wrong." };
  if (order.problem?.status === "resolved") return { ok: false, error: "This report has already been resolved. Please call us." };
  order.problem = { type, note: text, at: new Date().toISOString(), status: "open" };
  saveToDisk();
  return { ok: true, problem: { ...order.problem } };
}

export function resolveOrderProblem(id, by) {
  getOrder(id);
  const order = orders.get(String(id));
  if (!order?.problem) return { ok: false, error: "No problem reported on this order." };
  order.problem = { ...order.problem, status: "resolved", resolvedAt: new Date().toISOString(), resolvedBy: by || "Admin" };
  saveToDisk();
  return { ok: true };
}

/** Orders with a reported problem: open ones first, newest first. */
export function getOrderProblems() {
  return getAllOrders()
    .filter((order) => order.problem)
    .sort(
      (a, b) =>
        (a.problem.status === "open" ? 0 : 1) - (b.problem.status === "open" ? 0 : 1) ||
        String(b.problem.at).localeCompare(String(a.problem.at))
    )
    .map((order) => ({
      id: order.id,
      name: order.name,
      phone: order.phone,
      total: order.total,
      courierName: order.courierName || "",
      kitchenStaffName: order.kitchenStaffName || "",
      deliveredAt: order.deliveredAt || null,
      problem: { ...order.problem, label: PROBLEM_TYPES[order.problem.type] || order.problem.type },
    }));
}

// ---------------------------------------------------------------------------
// Account deletion
// ---------------------------------------------------------------------------

/** True while the customer has an order that isn't finished yet. */
export function hasActiveOrder(userId) {
  return getAllOrders().some(
    (order) => String(order.userId) === String(userId) && !["delivered", "cancelled"].includes(order.status)
  );
}

/**
 * Removes a customer's personal details from their past orders but keeps the
 * order itself (dishes, totals, who cooked and delivered it) for the books.
 */
export function anonymizeCustomerOrders(userId) {
  loadFromDisk();
  let count = 0;
  for (const order of orders.values()) {
    if (String(order.userId) !== String(userId)) continue;
    order.userId = "deleted";
    order.name = "Deleted customer";
    order.phone = "";
    order.addressDetails = "";
    order.deliveryCoordinates = null;
    delete order.ownerToken;
    if (order.problem) order.problem = { ...order.problem, note: "" };
    count++;
  }
  if (count) saveToDisk();
  return count;
}

// ---------------------------------------------------------------------------
// Order limits (stop accidental double-taps and spam; generous for real use)
// ---------------------------------------------------------------------------

const MAX_ACTIVE_ORDERS = 5;
const MAX_RECENT_ORDERS = 5;
const RECENT_WINDOW_MS = 10 * 60 * 1000;

/** An error message when this customer may not place another order now, or null. */
export function orderLimitError(userId) {
  const mine = getAllOrders().filter((order) => String(order.userId) === String(userId));
  const active = mine.filter((order) => !["delivered", "cancelled"].includes(order.status)).length;
  if (active >= MAX_ACTIVE_ORDERS) {
    return `You already have ${active} orders on the way. Please wait for one to arrive before ordering again.`;
  }
  const recent = mine.filter((order) => Date.now() - new Date(order.createdAt).getTime() < RECENT_WINDOW_MS).length;
  if (recent >= MAX_RECENT_ORDERS) {
    return "You've placed several orders in the last few minutes. Please wait a little before ordering again.";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Courier rating (separate from the food review)
// ---------------------------------------------------------------------------

export function setCourierRating(id, userId, rating) {
  getOrder(id);
  const order = orders.get(String(id));
  if (!order || String(order.userId) !== String(userId)) return { ok: false, error: "Order not found." };
  if (order.status !== "delivered" || !order.courierId) return { ok: false, error: "You can rate the courier after delivery." };
  const value = Number(rating);
  if (!Number.isInteger(value) || value < 1 || value > 5) return { ok: false, error: "Courier rating must be 1 to 5 stars." };
  order.courierRating = value;
  order.courierRatedAt = new Date().toISOString();
  saveToDisk();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Online payment (see lib/payments.js)
// ---------------------------------------------------------------------------

export function addPaymentReference(id, reference) {
  getOrder(id);
  const order = orders.get(String(id));
  if (!order || order.status !== "awaiting-payment") return false;
  order.payment = { ...order.payment, references: [...(order.payment?.references || []), reference].slice(-10) };
  saveToDisk();
  return true;
}

/** True when this reference belongs to the order (so a callback can't pay a different one). */
export function hasPaymentReference(id, reference) {
  const order = getOrder(id);
  return Boolean(order?.payment?.references?.includes(reference));
}

/**
 * Marks a verified payment. Safe to call more than once (the return page and
 * Chapa's callback may both report the same payment).
 * Returns { ok, changed } — changed is true only the first time.
 */
export function markOrderPaid(id, { reference, amount, method, chapaReference } = {}) {
  getOrder(id);
  const order = orders.get(String(id));
  if (!order) return { ok: false, error: "Order not found." };
  if (order.payment?.status === "paid") return { ok: true, changed: false };
  if (order.status !== "awaiting-payment") return { ok: false, error: "This order isn't waiting for payment." };
  order.status = "placed";
  // The 5-minute cancel window starts when the order really reaches the kitchen.
  order.paidAt = new Date().toISOString();
  order.payment = { ...order.payment, status: "paid", reference, amount, via: method || "", chapaReference: chapaReference || "" };
  saveToDisk();
  recordDishOrders(order.items);
  return { ok: true, changed: true };
}

/** The customer gives up on paying online and pays the courier instead. */
export function switchOrderToCash(id, userId) {
  getOrder(id);
  const order = orders.get(String(id));
  if (!order || String(order.userId) !== String(userId)) return { ok: false, error: "Order not found." };
  if (order.status !== "awaiting-payment") return { ok: false, error: "This order isn't waiting for payment." };
  order.status = "placed";
  order.payment = { ...order.payment, method: "cash", status: "switched-to-cash" };
  order.paidAt = new Date().toISOString();
  saveToDisk();
  recordDishOrders(order.items);
  return { ok: true };
}

/** Removes an order whose online payment could not even be started. */
export function discardUnstartedOrder(id) {
  getOrder(id);
  const order = orders.get(String(id));
  if (!order || order.status !== "awaiting-payment" || order.payment?.references?.length) return false;
  orders.delete(String(id));
  saveToDisk();
  return true;
}

/**
 * An order number no other server is using: each number is claimed with a
 * once-only lock first. Without the database this is just the next number.
 */
export async function reserveOrderNumber() {
  const owner = crypto.randomUUID();
  for (let attempt = 0; attempt < 25; attempt++) {
    const id = nextOrderNumber();
    const lock = await takeLock(`order-number:${id}`, owner);
    if (lock.state !== "taken") return id;
  }
  return nextOrderNumber();
}

/** The customer's optional star rating for the cook who made the order. */
export function setCookRating(id, userId, rating) {
  getOrder(id);
  const order = orders.get(String(id));
  if (!order || String(order.userId) !== String(userId)) return { ok: false, error: "Order not found." };
  if (order.status !== "delivered" || !order.kitchenStaffId) return { ok: false, error: "You can rate the cook after delivery." };
  const value = Number(rating);
  if (!Number.isInteger(value) || value < 1 || value > 5) return { ok: false, error: "Cook rating must be 1 to 5 stars." };
  order.cookRating = value;
  order.cookRatedAt = new Date().toISOString();
  saveToDisk();
  return { ok: true };
}
