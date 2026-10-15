import { addDishReview } from "./dishes";

function getOrdersStorePath() {
  const nodePath = eval("require")("path");
  const directory = process.env.ADDIS_DATA_DIR || nodePath.join(process.cwd(), ".addis-data");
  return nodePath.join(directory, "orders.json");
}

function loadFromDisk() {
  if (typeof window !== "undefined") return;
  try {
    const nodeFs = eval("require")("fs");
    const storePath = getOrdersStorePath();
    if (nodeFs.existsSync(storePath)) {
      const raw = nodeFs.readFileSync(storePath, "utf-8");
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) {
        throw new Error("Orders store must contain an array.");
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
  } catch (error) {
    throw new Error("Unable to load the local orders store.", { cause: error });
  }
}

function saveToDisk() {
  if (typeof window !== "undefined") return;
  try {
    const nodeFs = eval("require")("fs");
    const nodePath = eval("require")("path");
    const nodeCrypto = eval("require")("crypto");
    const storePath = getOrdersStorePath();
    nodeFs.mkdirSync(nodePath.dirname(storePath), { recursive: true, mode: 0o700 });
    const temporaryPath = `${storePath}.${nodeCrypto.randomUUID()}.tmp`;
    nodeFs.writeFileSync(temporaryPath, JSON.stringify(Array.from(orders.values())), {
      encoding: "utf-8",
      mode: 0o600,
    });
    nodeFs.renameSync(temporaryPath, storePath);
  } catch (error) {
    throw new Error("Unable to save the local orders store.", { cause: error });
  }
}

export const DELIVERY_LOCATIONS = [
  { id: "bole", name: "Bole", driveTime: "15-20 mins", fee: 50, area: "Edna Mall, Medhanialem, Olympia" },
  { id: "kazanchis", name: "Kazanchis", driveTime: "15-25 mins", fee: 50, area: "UNECA, Intercontinental, Bambis" },
  { id: "mexico", name: "Mexico", driveTime: "20-25 mins", fee: 50, area: "Sengatera, Stadium, Kera" },
  { id: "sarbet", name: "Sarbet", driveTime: "20-25 mins", fee: 50, area: "Old Airport, AU Headquarters, Karl Square" },
  { id: "piassa", name: "Piassa", driveTime: "25-30 mins", fee: 70, area: "Churchill Ave, Arada, Posta Bet" },
  { id: "gerji", name: "Gerji", driveTime: "25-35 mins", fee: 70, area: "Imperial, Roba Bakery, Jackros" },
  { id: "megenagna", name: "Megenagna", driveTime: "20-30 mins", fee: 70, area: "Signal, Shola, Lem Hotel" },
  { id: "cmc", name: "CMC", driveTime: "35-45 mins", fee: 90, area: "Michael, Tsehay Real Estate, Altad" },
  { id: "lebu", name: "Lebu", driveTime: "35-45 mins", fee: 90, area: "Jemo, Haile Garment, Varnero" },
  { id: "ayat", name: "Ayat", driveTime: "40-50 mins", fee: 110, area: "Ayat Zone 2 & 3, Tafo Highway" },
  { id: "other", name: "Other Neighborhood", driveTime: "30-45 mins", fee: 100, area: "Custom neighborhood or landmark" },
];

export function getLocationFee(locName) {
  const match = DELIVERY_LOCATIONS.find((l) => l.name.toLowerCase() === (locName || "").toLowerCase());
  return match ? match.fee : 50;
}

export function getLocationDriveTime(locName) {
  const match = DELIVERY_LOCATIONS.find((l) => l.name.toLowerCase() === (locName || "").toLowerCase());
  return match ? match.driveTime : DELIVERY_LOCATIONS[0].driveTime;
}

// Order database with ownership, status progression, delivery confirmations, reviews, and detailed timings
if (!globalThis.__addis_orders) {
  globalThis.__addis_orders = new Map();
  globalThis.__addis_order_counter = 1015;

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const hourMs = 60 * 60 * 1000;
  const minMs = 60 * 1000;

  // Realistic seed orders across past 5 days with varied Addis Ababa neighborhoods & timing records
  const seedOrders = [
    {
      id: "1000",
      userId: "usr_almaz",
      name: "Almaz Bekele",
      phone: "0912345678",
      location: "Bole",
      estimatedEta: "15-20 mins",
      foodTotal: 860,
      deliveryFee: 50,
      total: 910,
      ownerToken: "demo-token-1000",
      status: "delivered",
      courierId: "usr_dani",
      courierName: "Daniel Delivery",
      confirmedByCustomer: true,
      receivedAt: new Date(now - hourMs * 2 + minMs * 39).toISOString(),
      reviewed: true,
      reviewRating: 5,
      reviewComment: "Rich authentic berbere sauce and piping hot injera. Arrived fast!",
      createdAt: new Date(now - hourMs * 2).toISOString(),
      cookingStartedAt: new Date(now - hourMs * 2 + minMs * 2).toISOString(),
      kitchenServedAt: new Date(now - hourMs * 2 + minMs * 17).toISOString(),
      kitchenDurationMinutes: 17,
      deliveryStartedAt: new Date(now - hourMs * 2 + minMs * 19).toISOString(),
      deliveredAt: new Date(now - hourMs * 2 + minMs * 38).toISOString(),
      deliveryDurationMinutes: 19,
      totalDurationMinutes: 38,
    },
    {
      id: "1001",
      userId: "usr_dawit",
      name: "Dawit Haile",
      phone: "0911445566",
      location: "Kazanchis",
      estimatedEta: "15-25 mins",
      foodTotal: 630,
      deliveryFee: 50,
      total: 680,
      ownerToken: "token-1001",
      status: "delivered",
      courierId: "usr_dani",
      courierName: "Daniel Delivery",
      confirmedByCustomer: true,
      receivedAt: new Date(now - hourMs * 4 + minMs * 41).toISOString(),
      reviewed: true,
      reviewRating: 5,
      reviewComment: "Best kibbeh aroma in town! Arrived warm at UNECA gate.",
      createdAt: new Date(now - hourMs * 4).toISOString(),
      cookingStartedAt: new Date(now - hourMs * 4 + minMs * 1).toISOString(),
      kitchenServedAt: new Date(now - hourMs * 4 + minMs * 15).toISOString(),
      kitchenDurationMinutes: 15,
      deliveryStartedAt: new Date(now - hourMs * 4 + minMs * 18).toISOString(),
      deliveredAt: new Date(now - hourMs * 4 + minMs * 40).toISOString(),
      deliveryDurationMinutes: 22,
      totalDurationMinutes: 40,
    },
    {
      id: "1002",
      userId: "usr_selam",
      name: "Selamawit Tadesse",
      phone: "0920334455",
      location: "Bole",
      estimatedEta: "15-20 mins",
      foodTotal: 860,
      deliveryFee: 50,
      total: 910,
      ownerToken: "token-1002",
      status: "delivered",
      courierId: "usr_dani",
      courierName: "Daniel Delivery",
      confirmedByCustomer: false,
      createdAt: new Date(now - hourMs * 6).toISOString(),
      cookingStartedAt: new Date(now - hourMs * 6 + minMs * 2).toISOString(),
      kitchenServedAt: new Date(now - hourMs * 6 + minMs * 18).toISOString(),
      kitchenDurationMinutes: 18,
      deliveryStartedAt: new Date(now - hourMs * 6 + minMs * 20).toISOString(),
      deliveredAt: new Date(now - hourMs * 6 + minMs * 39).toISOString(),
      deliveryDurationMinutes: 19,
      totalDurationMinutes: 39,
    },
    {
      id: "1003",
      userId: "usr_yohannes",
      name: "Yohannes Girma",
      phone: "0911778899",
      location: "Sarbet",
      estimatedEta: "20-25 mins",
      foodTotal: 730,
      deliveryFee: 50,
      total: 780,
      ownerToken: "token-1003",
      status: "on-the-way",
      courierId: "usr_dani",
      courierName: "Daniel Delivery",
      createdAt: new Date(now - minMs * 28).toISOString(),
      cookingStartedAt: new Date(now - minMs * 26).toISOString(),
      kitchenServedAt: new Date(now - minMs * 12).toISOString(),
      kitchenDurationMinutes: 16,
      deliveryStartedAt: new Date(now - minMs * 10).toISOString(),
    },
    {
      id: "1004",
      userId: "usr_helena",
      name: "Helena Assefa",
      phone: "0912889900",
      location: "Piassa",
      estimatedEta: "25-30 mins",
      foodTotal: 600,
      deliveryFee: 70,
      total: 670,
      ownerToken: "token-1004",
      status: "served",
      createdAt: new Date(now - minMs * 18).toISOString(),
      cookingStartedAt: new Date(now - minMs * 17).toISOString(),
      kitchenServedAt: new Date(now - minMs * 2).toISOString(),
      kitchenDurationMinutes: 16,
    },
    {
      id: "1005",
      userId: "usr_kebede",
      name: "Kebede Worku",
      phone: "0911223344",
      location: "Mexico",
      estimatedEta: "20-25 mins",
      foodTotal: 700,
      deliveryFee: 50,
      total: 750,
      ownerToken: "token-1005",
      status: "preparing",
      createdAt: new Date(now - minMs * 8).toISOString(),
      cookingStartedAt: new Date(now - minMs * 7).toISOString(),
    },
    {
      id: "1006",
      userId: "usr_meron",
      name: "Meron Fikre",
      phone: "0930112233",
      location: "Gerji",
      estimatedEta: "25-35 mins",
      foodTotal: 1120,
      deliveryFee: 70,
      total: 1190,
      ownerToken: "token-1006",
      status: "delivered",
      courierId: "usr_dani",
      courierName: "Daniel Delivery",
      confirmedByCustomer: true,
      receivedAt: new Date(now - dayMs * 1 - hourMs * 5 + minMs * 50).toISOString(),
      reviewed: true,
      reviewRating: 5,
      reviewComment: "Authentic mitmita spice level! Perfect family dinner.",
      createdAt: new Date(now - dayMs * 1 - hourMs * 5).toISOString(),
      kitchenServedAt: new Date(now - dayMs * 1 - hourMs * 5 + minMs * 20).toISOString(),
      kitchenDurationMinutes: 20,
      deliveredAt: new Date(now - dayMs * 1 - hourMs * 5 + minMs * 48).toISOString(),
      deliveryDurationMinutes: 28,
      totalDurationMinutes: 48,
    },
    {
      id: "1007",
      userId: "usr_abebayehu",
      name: "Abebayehu Mengistu",
      phone: "0915667788",
      location: "CMC",
      estimatedEta: "35-45 mins",
      foodTotal: 1120,
      deliveryFee: 90,
      total: 1210,
      ownerToken: "token-1007",
      status: "delivered",
      courierId: "usr_dani",
      courierName: "Daniel Delivery",
      confirmedByCustomer: true,
      receivedAt: new Date(now - dayMs * 2 - hourMs * 3 + minMs * 57).toISOString(),
      createdAt: new Date(now - dayMs * 2 - hourMs * 3).toISOString(),
      kitchenServedAt: new Date(now - dayMs * 2 - hourMs * 3 + minMs * 18).toISOString(),
      kitchenDurationMinutes: 18,
      deliveredAt: new Date(now - dayMs * 2 - hourMs * 3 + minMs * 55).toISOString(),
      deliveryDurationMinutes: 37,
      totalDurationMinutes: 55,
    },
    {
      id: "1008",
      userId: "usr_almaz",
      name: "Almaz Bekele",
      phone: "0912345678",
      location: "Bole",
      estimatedEta: "15-20 mins",
      foodTotal: 750,
      deliveryFee: 50,
      total: 800,
      ownerToken: "demo-token-1000",
      status: "delivered",
      courierId: "usr_dani",
      courierName: "Daniel Delivery",
      confirmedByCustomer: true,
      receivedAt: new Date(now - dayMs * 3 - hourMs * 4 + minMs * 33).toISOString(),
      createdAt: new Date(now - dayMs * 3 - hourMs * 4).toISOString(),
      kitchenServedAt: new Date(now - dayMs * 3 - hourMs * 4 + minMs * 14).toISOString(),
      kitchenDurationMinutes: 14,
      deliveredAt: new Date(now - dayMs * 3 - hourMs * 4 + minMs * 31).toISOString(),
      deliveryDurationMinutes: 17,
      totalDurationMinutes: 31,
    },
    {
      id: "1009",
      userId: "usr_kassahun",
      name: "Kassahun Desta",
      phone: "0918990011",
      location: "Megenagna",
      estimatedEta: "20-30 mins",
      foodTotal: 660,
      deliveryFee: 70,
      total: 730,
      ownerToken: "token-1009",
      status: "delivered",
      courierId: "usr_dani",
      courierName: "Daniel Delivery",
      confirmedByCustomer: true,
      receivedAt: new Date(now - dayMs * 4 - hourMs * 2 + minMs * 43).toISOString(),
      createdAt: new Date(now - dayMs * 4 - hourMs * 2).toISOString(),
      kitchenServedAt: new Date(now - dayMs * 4 - hourMs * 2 + minMs * 16).toISOString(),
      kitchenDurationMinutes: 16,
      deliveredAt: new Date(now - dayMs * 4 - hourMs * 2 + minMs * 41).toISOString(),
      deliveryDurationMinutes: 25,
      totalDurationMinutes: 41,
    },
    {
      id: "1010",
      userId: "usr_solomon",
      name: "Solomon Getachew",
      phone: "0914223344",
      location: "Ayat",
      estimatedEta: "40-50 mins",
      foodTotal: 890,
      deliveryFee: 110,
      total: 1000,
      ownerToken: "token-1010",
      status: "delivered",
      courierId: "usr_dani",
      courierName: "Daniel Delivery",
      confirmedByCustomer: true,
      receivedAt: new Date(now - dayMs * 4 - hourMs * 6 + minMs * 70).toISOString(),
      createdAt: new Date(now - dayMs * 4 - hourMs * 6).toISOString(),
      kitchenServedAt: new Date(now - dayMs * 4 - hourMs * 6 + minMs * 22).toISOString(),
      kitchenDurationMinutes: 22,
      deliveredAt: new Date(now - dayMs * 4 - hourMs * 6 + minMs * 68).toISOString(),
      deliveryDurationMinutes: 46,
      totalDurationMinutes: 68,
    },
  ];

  for (const o of seedOrders) {
    globalThis.__addis_orders.set(o.id, o);
  }
}

const orders = globalThis.__addis_orders;
loadFromDisk();

export function saveOrder(order) {
  if (!order || !order.id) return;
  orders.set(String(order.id), order);
  const numId = Number(order.id);
  if (!isNaN(numId) && numId >= globalThis.__addis_order_counter) {
    globalThis.__addis_order_counter = numId + 1;
  }
  saveToDisk();
}

export function encodeOrder(order) {
  try {
    return Buffer.from(JSON.stringify(order)).toString("base64url");
  } catch {
    return "";
  }
}

export function decodeOrder(token) {
  if (!token) return null;
  try {
    const jsonStr = Buffer.from(token, "base64url").toString("utf8");
    const data = JSON.parse(jsonStr);
    if (data && data.id) {
      return data;
    }
  } catch {}
  try {
    const data = JSON.parse(decodeURIComponent(token));
    if (data && data.id) return data;
  } catch {}
  return null;
}

export function getOrderFromCookies(id, cookieStore) {
  if (!id) return null;
  try {
    const lastOrderToken = cookieStore?.get ? cookieStore.get("last_order")?.value : cookieStore?.last_order;
    if (lastOrderToken) {
      const decoded = decodeOrder(lastOrderToken);
      if (decoded && String(decoded.id) === String(id)) {
        saveOrder(decoded);
        return decoded;
      }
    }
  } catch {}

  try {
    const recentToken = cookieStore?.get ? cookieStore.get("recent_orders")?.value : cookieStore?.recent_orders;
    if (recentToken) {
      let list = [];
      try {
        list = JSON.parse(Buffer.from(recentToken, "base64url").toString("utf8"));
      } catch {
        list = JSON.parse(decodeURIComponent(recentToken));
      }
      if (Array.isArray(list)) {
        const match = list.find((o) => String(o.id) === String(id));
        if (match) {
          saveOrder(match);
          return match;
        }
      }
    }
  } catch {}

  return null;
}

export function getRecentOrdersFromCookies(cookieStore) {
  try {
    const recentToken = cookieStore?.get ? cookieStore.get("recent_orders")?.value : cookieStore?.recent_orders;
    if (recentToken) {
      let list = [];
      try {
        list = JSON.parse(Buffer.from(recentToken, "base64url").toString("utf8"));
      } catch {
        list = JSON.parse(decodeURIComponent(recentToken));
      }
      if (Array.isArray(list)) {
        list.forEach((o) => saveOrder(o));
        return list;
      }
    }
  } catch {}
  return [];
}

export function createOrder({
  userId = "usr_guest",
  name,
  phone,
  items,
  ownerToken,
  location = "Bole",
  estimatedEta = "15-20 mins",
  deliveryFee = 50,
  deliveryCoordinates = null,
}) {
  loadFromDisk();
  const id = String(globalThis.__addis_order_counter++);
  const foodTotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const total = foodTotal + Number(deliveryFee);
  const order = {
    id,
    userId,
    name,
    phone,
    items,
    foodTotal,
    deliveryFee: Number(deliveryFee),
    total,
    ownerToken,
    location,
    estimatedEta,
    deliveryCoordinates,
    status: "placed",
    confirmedByCustomer: false,
    reviewed: false,
    createdAt: new Date().toISOString(),
  };
  orders.set(id, order);
  saveToDisk();
  return order;
}

export function getOrder(id) {
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
  return String(order.userId) === String(userId) ? order : null;
}

export function toOrderClientData(order) {
  if (!order) return null;
  const clientData = { ...order };
  delete clientData.userId;
  delete clientData.ownerToken;
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
    neighbourhood: order.neighbourhood,
    deliveryCoordinates: order.deliveryCoordinates || null,
    courierLocation: order.courierLocation || null,
    estimatedEta: order.estimatedEta || null,
    total: order.total,
    items: (order.items || []).map(({ id, name, qty, price, image }) => ({
      id,
      name,
      qty,
      price,
      image,
    })),
  };
}

export function getOrdersFor(userId) {
  if (!userId) return [];
  return getAllOrders()
    .filter((order) => order.userId === userId)
    .map(toOrderClientData);
}

export function getOrdersByOwner(ownerToken) {
  if (!ownerToken) return [];
  return getAllOrders()
    .filter((order) => order.ownerToken === ownerToken)
}

export function getAllOrders() {
  loadFromDisk();
  return [...orders.values()].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
}

export function getKitchenOrdersFor(staffId, isAdmin = false) {
  const scopedOrders = isAdmin
    ? getAllOrders()
    : getAllOrders().filter((order) =>
        (["placed", "preparing"].includes(order.status) && !order.kitchenStaffId) ||
        (String(order.kitchenStaffId) === String(staffId) &&
          ["preparing", "served"].includes(order.status))
      );

  if (isAdmin) return scopedOrders.map(toOrderClientData);
  return scopedOrders.map((order) => ({
    id: order.id,
    status: order.status,
    createdAt: order.createdAt,
    items: (order.items || []).map(({ id, name, qty, price, image }) => ({
      id,
      name,
      qty,
      price,
      image,
    })),
  }));
}

export function getDeliveryOrdersFor(courierId, isAdmin = false) {
  const scopedOrders = isAdmin
    ? getAllOrders()
    : getAllOrders().filter((order) =>
        (order.status === "served" && !order.courierId) ||
        (String(order.courierId) === String(courierId) &&
          ["on-the-way", "delivered"].includes(order.status))
      );

  if (isAdmin) return scopedOrders.map(toOrderClientData);
  return scopedOrders.map((order) => {
    const assignedToCourier = String(order.courierId) === String(courierId);
    return {
      id: order.id,
      status: order.status,
      createdAt: order.createdAt,
      location: order.location,
      estimatedEta: order.estimatedEta,
      items: (order.items || []).map(({ id, name, qty, price, image }) => ({
        id,
        name,
        qty,
        price,
        image,
      })),
      deliveryFee: order.deliveryFee,
      foodTotal: order.foodTotal,
      total: order.total,
      courierId: assignedToCourier ? order.courierId : null,
      courierName: assignedToCourier ? order.courierName : null,
      deliveryStartedAt: assignedToCourier ? order.deliveryStartedAt : null,
      deliveredAt: assignedToCourier ? order.deliveredAt : null,
      ...(assignedToCourier ? {
        name: order.name,
        phone: order.phone,
        deliveryCoordinates: order.deliveryCoordinates || null,
        adminEdited: order.adminEdited,
        adminEditedBy: order.adminEditedBy,
        adminEditNote: order.adminEditNote,
      } : {}),
    };
  });
}

export function updateKitchenOrderStatus(id, newStatus, staffId, isAdmin = false) {
  getOrder(id);
  const order = orders.get(String(id));
  if (!order) return { ok: false, error: "Order not found." };
  if (!["preparing", "served"].includes(newStatus)) {
    return { ok: false, error: "Kitchen staff can only start or finish preparation." };
  }

  const ownsAssignment = String(order.kitchenStaffId) === String(staffId);
  if (newStatus === "preparing") {
    if (order.status !== "placed" || (order.kitchenStaffId && !ownsAssignment)) {
      return { ok: false, error: "This order is no longer available to start." };
    }
    if (!isAdmin) order.kitchenStaffId = staffId;
  } else if (order.status !== "preparing" || (!isAdmin && order.kitchenStaffId && !ownsAssignment)) {
    return { ok: false, error: "Only the assigned kitchen staff member can mark this order ready." };
  } else if (!order.kitchenStaffId && !isAdmin) {
    order.kitchenStaffId = staffId;
  }

  const updated = updateOrderStatus(id, newStatus);
  return updated
    ? { ok: true, order: updated }
    : { ok: false, error: "The order could not be updated." };
}

export function updateOrderStatus(id, newStatus) {
  getOrder(id);
  const order = orders.get(String(id));
  if (!order) return null;
  const allowedTransitions = {
    placed: ["preparing"],
    preparing: ["served"],
    served: ["on-the-way"],
    "on-the-way": ["delivered"],
  };
  if (!allowedTransitions[order.status]?.includes(newStatus)) return null;
  const now = new Date();
  order.status = newStatus;

  if (newStatus === "preparing" && !order.cookingStartedAt) {
    order.cookingStartedAt = now.toISOString();
  } else if (newStatus === "served" && !order.kitchenServedAt) {
    order.kitchenServedAt = now.toISOString();
    const created = new Date(order.createdAt).getTime();
    order.kitchenDurationMinutes = Math.max(1, Math.round((now.getTime() - created) / 60000));
  } else if (newStatus === "on-the-way" && !order.deliveryStartedAt) {
    order.deliveryStartedAt = now.toISOString();
    if (!order.kitchenServedAt) {
      order.kitchenServedAt = now.toISOString();
      const created = new Date(order.createdAt).getTime();
      order.kitchenDurationMinutes = Math.max(1, Math.round((now.getTime() - created) / 60000));
    }
  } else if (newStatus === "delivered" && !order.deliveredAt) {
    order.deliveredAt = now.toISOString();
    const startTransit = order.deliveryStartedAt
      ? new Date(order.deliveryStartedAt).getTime()
      : order.kitchenServedAt
      ? new Date(order.kitchenServedAt).getTime()
      : new Date(order.createdAt).getTime();
    order.deliveryDurationMinutes = Math.max(1, Math.round((now.getTime() - startTransit) / 60000));
    const created = new Date(order.createdAt).getTime();
    order.totalDurationMinutes = Math.max(1, Math.round((now.getTime() - created) / 60000));
  }

  saveToDisk();
  return { ...order };
}

export function claimAndStartDelivery(id, courierId, courierName) {
  getOrder(id);
  const order = orders.get(String(id));
  if (!order) return { ok: false, error: "Order not found." };
  if (order.status !== "served" || order.courierId) {
    return { ok: false, error: "Only an unassigned, kitchen-ready order can be claimed." };
  }
  const now = new Date();
  order.courierId = courierId;
  order.courierName = courierName || "Courier";
  order.status = "on-the-way";
  if (!order.deliveryStartedAt) {
    order.deliveryStartedAt = now.toISOString();
  }
  saveToDisk();
  return { ok: true, order: { ...order } };
}

export function completeDelivery(id, courierId) {
  getOrder(id);
  const order = orders.get(String(id));
  if (!order) return { ok: false, error: "Order not found." };
  if (order.status !== "on-the-way" || !courierId || order.courierId !== courierId) {
    return { ok: false, error: "Only the assigned courier can mark this order as delivered." };
  }
  const now = new Date();
  order.status = "delivered";
  if (!order.deliveredAt) {
    order.deliveredAt = now.toISOString();
    const startTransit = order.deliveryStartedAt
      ? new Date(order.deliveryStartedAt).getTime()
      : order.kitchenServedAt
      ? new Date(order.kitchenServedAt).getTime()
      : new Date(order.createdAt).getTime();
    order.deliveryDurationMinutes = Math.max(1, Math.round((now.getTime() - startTransit) / 60000));
    const created = new Date(order.createdAt).getTime();
    order.totalDurationMinutes = Math.max(1, Math.round((now.getTime() - created) / 60000));
  }
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
  const now = new Date();
  order.confirmedByCustomer = true;
  if (!order.receivedAt) {
    order.receivedAt = now.toISOString();
    const created = new Date(order.createdAt).getTime();
    order.totalDoorToDoorMinutes = Math.max(1, Math.round((now.getTime() - created) / 60000));
  }
  saveToDisk();
  return { ...order };
}

export function adminEditOrderRecord(id, { phone, location, note }, adminName) {
  getOrder(id);
  const order = orders.get(String(id));
  if (!order) return { ok: false, error: "Order not found." };
  if (phone) {
    order.phone = String(phone).trim();
  }
  if (location) {
    order.location = String(location).trim();
    const newFee = getLocationFee(order.location);
    order.deliveryFee = newFee;
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

  if (Array.isArray(order.items)) {
    order.items.forEach((item) => {
      addDishReview(item.id || item.name, rating, comment);
    });
  }
  saveToDisk();
  return { ...order };
}

export function cancelOrderRecord(id, userId, isStaff = false) {
  getOrder(id);
  const order = orders.get(String(id));
  if (!order) {
    return { ok: false, status: 404, error: "Order not found." };
  }
  if (order.userId !== userId && !isStaff) {
    return { ok: false, status: 403, error: "Not yours: you do not own this order." };
  }
  if (!isStaff) {
    const ageMs = Date.now() - new Date(order.createdAt).getTime();
    if (order.status !== "placed" || ageMs > 5 * 60 * 1000) {
      return { ok: false, status: 400, error: "Cancel requests can only be placed within 5 minutes of ordering and before cooking begins." };
    }
  }
  order.status = "cancelled";
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
