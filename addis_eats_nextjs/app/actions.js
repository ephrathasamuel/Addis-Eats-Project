"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { validateOrder, validateSignIn } from "@/lib/validation";
import {
  createOrder,
  cancelOrderRecord,
  updateOrderStatus,
  confirmOrderReceived,
  submitOrderReview,
  claimAndStartDelivery,
  completeDelivery,
  adminEditOrderRecord,
  encodeOrder,
} from "@/lib/orders";
import { getSession, createSession, clearSession } from "@/lib/session";
import {
  toggleDishSoldOut,
  removeDish,
  restoreDish,
  addDish,
  updateDish,
} from "@/lib/dishes";
import { addDailyExpense } from "@/lib/finances";

/**
 * Place Order Server Action
 * Layer 3 Check: Reads session internally on the server, binding the order to the authenticated user.
 */
export async function placeOrder(formData) {
  const name = formData.get("name");
  const phone = formData.get("phone");
  const itemsRaw = formData.get("items");
  const selectedLocation = formData.get("location") || "Bole";
  const customLocation = formData.get("customLocation");
  const finalLocation =
    selectedLocation === "Other Neighborhood" && customLocation?.trim()
      ? customLocation.trim()
      : selectedLocation;
  const estimatedEta = formData.get("estimatedEta") || "20-30 mins";

  let items = [];
  try {
    items = JSON.parse(itemsRaw || "[]");
  } catch {
    items = [];
  }

  const { valid, fieldErrors } = validateOrder({ name, phone, items });

  if (!valid) {
    const params = new URLSearchParams();
    params.set("items", itemsRaw || "[]");
    params.set("name", name || "");
    params.set("phone", phone || "");
    params.set("location", selectedLocation || "Bole");
    if (customLocation) params.set("customLocation", customLocation);
    params.set("error", JSON.stringify(fieldErrors));
    redirect(`/checkout?${params.toString()}`);
  }

  const session = await getSession();
  const userId = session?.id || "usr_guest";

  const order = createOrder({
    userId,
    name,
    phone,
    items,
    ownerToken: session?.token || "guest_token",
    location: finalLocation,
    estimatedEta,
  });

  const cookieStore = await cookies();
  const isProd = process.env.NODE_ENV === "production";
  try {
    const encodedOrder = encodeOrder(order);
    cookieStore.set("last_order", encodedOrder, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
      secure: isProd,
    });

    let recentOrders = [order];
    const existingRecent = cookieStore.get("recent_orders")?.value;
    if (existingRecent) {
      try {
        let prev = [];
        try {
          prev = JSON.parse(Buffer.from(existingRecent, "base64url").toString("utf8"));
        } catch {
          prev = JSON.parse(decodeURIComponent(existingRecent));
        }
        if (Array.isArray(prev)) {
          recentOrders = [order, ...prev.filter((o) => String(o.id) !== String(order.id))].slice(0, 10);
        }
      } catch {}
    }
    const encodedRecent = Buffer.from(JSON.stringify(recentOrders)).toString("base64url");
    cookieStore.set("recent_orders", encodedRecent, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
      secure: isProd,
    });
  } catch {}

  revalidatePath("/checkout/confirmation");
  revalidatePath("/orders");
  revalidatePath(`/orders/${order.id}`);

  redirect(`/checkout/confirmation?order=${order.id}`);
}

/**
 * Cancel Order Server Action
 * Layer 3 Check: Authenticates caller via getSession() and enforces ownership server-side.
 */
export async function cancelOrder(orderId) {
  const user = await getSession();
  if (!user) {
    return { ok: false, status: 401, error: "Authentication required." };
  }

  const res = cancelOrderRecord(orderId, user.id, user.role === "staff" || user.role === "admin");
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  return res;
}

/**
 * Sign In Server Action
 * Issues an httpOnly session cookie and validates destination to stop open-redirects.
 */
export async function signIn(formData) {
  const name = formData.get("name") || "Demo User";
  const email = formData.get("email");
  const password = formData.get("password");
  const rawNext = formData.get("next") || "/";

  const { valid, fieldErrors } = validateSignIn({ name, email, password });

  if (!valid) {
    const params = new URLSearchParams();
    params.set("name", name || "");
    params.set("email", email || "");
    params.set("next", rawNext);
    params.set("error", JSON.stringify(fieldErrors));
    redirect(`/signin?${params.toString()}`);
  }

  const emailLower = email.toLowerCase();
  const isAdmin = emailLower.includes("admin");
  const isDelivery = emailLower.includes("delivery") || emailLower.includes("courier") || emailLower.includes("driver");
  const isStaff = !isAdmin && !isDelivery && (emailLower.includes("staff") || emailLower === "chef@addiseats.com" || emailLower.includes("kitchen"));
  const role = isAdmin ? "admin" : isDelivery ? "delivery" : isStaff ? "staff" : "customer";
  const userId = isAdmin
    ? "usr_admin"
    : isDelivery
    ? "usr_courier_abebe"
    : isStaff
    ? "usr_chef_kassahun"
    : `usr_${encodeURIComponent(name.toLowerCase().replace(/\s+/g, "_"))}`;

  await createSession({
    id: userId,
    name,
    email,
    role,
  });

  let safeNext = "/";
  if (typeof rawNext === "string" && rawNext.startsWith("/") && !rawNext.startsWith("//")) {
    safeNext = rawNext;
  }

  // Smart landing redirect based on role
  if (role === "delivery") {
    safeNext = "/delivery";
  } else if (role === "staff" && (safeNext === "/" || safeNext === "/orders" || safeNext === "/admin")) {
    safeNext = "/kitchen";
  } else if (role === "admin" && (safeNext === "/" || safeNext === "/orders")) {
    safeNext = "/admin";
  }

  redirect(safeNext);
}

/**
 * Sign Out Server Action
 */
export async function signOut() {
  await clearSession();
  redirect("/");
}

/**
 * Staff Kitchen & Delivery Courier Status Update Action
 */
export async function updateKitchenStatus(orderId, newStatus) {
  const user = await getSession();
  if (!user || (user.role !== "staff" && user.role !== "admin" && user.role !== "delivery")) {
    return { ok: false, status: 403, error: "Unauthorized: Staff or courier permission required." };
  }

  const updated = updateOrderStatus(orderId, newStatus);
  revalidatePath("/kitchen");
  revalidatePath("/delivery");
  revalidatePath("/admin");
  revalidatePath(`/orders/${orderId}`);
  return { ok: true, order: updated };
}

export async function updateDeliveryStatus(orderId, newStatus) {
  return updateKitchenStatus(orderId, newStatus);
}

/**
 * Admin Action: Toggle Sold Out status on a dish
 */
export async function toggleSoldOutAction(dishId) {
  const user = await getSession();
  if (!user || (user.role !== "staff" && user.role !== "admin")) {
    return { ok: false, error: "Unauthorized: Admin permission required." };
  }

  const dish = toggleDishSoldOut(dishId);
  revalidatePath("/admin");
  revalidatePath("/menu");
  revalidatePath("/");
  return { ok: true, isSoldOut: dish?.isSoldOut };
}

/**
 * Admin Action: Remove / Archive a dish from the menu
 */
export async function removeDishAction(dishId) {
  const user = await getSession();
  if (!user || (user.role !== "staff" && user.role !== "admin")) {
    return { ok: false, error: "Unauthorized: Admin permission required." };
  }

  const dish = removeDish(dishId);
  revalidatePath("/admin");
  revalidatePath("/menu");
  revalidatePath("/");
  return { ok: true, isRemoved: true };
}

/**
 * Admin Action: Restore a previously removed dish
 */
export async function restoreDishAction(dishId) {
  const user = await getSession();
  if (!user || (user.role !== "staff" && user.role !== "admin")) {
    return { ok: false, error: "Unauthorized: Admin permission required." };
  }

  const dish = restoreDish(dishId);
  revalidatePath("/admin");
  revalidatePath("/menu");
  revalidatePath("/");
  return { ok: true, isRemoved: false };
}

/**
 * Admin Action: Add a new dish to the live menu
 */
export async function addDishAction(formData) {
  const user = await getSession();
  if (!user || user.role !== "admin") {
    return { ok: false, error: "Unauthorized: Administrator permissions required." };
  }

  const name = formData.get("name")?.trim();
  const category = formData.get("category")?.trim();
  const price = formData.get("price");
  const spicy = formData.get("spicy") === "true" || formData.get("spicy") === "on";
  const tag = formData.get("tag")?.trim();
  const description = formData.get("description")?.trim();
  const image = formData.get("image")?.trim();

  if (!name) {
    return { ok: false, error: "Dish name is required." };
  }
  if (!price || isNaN(Number(price)) || Number(price) <= 0) {
    return { ok: false, error: "A valid positive price in ETB is required." };
  }

  const newDish = addDish({
    name,
    category: category || "Traditional",
    price: Number(price),
    spicy,
    tag: tag || "Chef's Special",
    description: description || "Freshly cooked specialty.",
    image: image || "/images/food/doro-wat.jpg",
  });

  revalidatePath("/admin");
  revalidatePath("/menu");
  revalidatePath("/");
  return { ok: true, dish: newDish };
}

/**
 * Admin Action: Edit details of an existing food in the menu
 */
export async function editDishAction(formData) {
  const user = await getSession();
  if (!user || user.role !== "admin") {
    return { ok: false, error: "Unauthorized: Administrator permissions required." };
  }

  const id = formData.get("id");
  const name = formData.get("name")?.trim();
  const category = formData.get("category")?.trim();
  const price = formData.get("price");
  const spicy = formData.get("spicy") === "true" || formData.get("spicy") === "on";
  const tag = formData.get("tag")?.trim();
  const description = formData.get("description")?.trim();
  const image = formData.get("image")?.trim();

  if (!id) {
    return { ok: false, error: "Dish ID is missing." };
  }
  if (!name) {
    return { ok: false, error: "Dish name cannot be empty." };
  }
  if (!price || isNaN(Number(price)) || Number(price) <= 0) {
    return { ok: false, error: "Valid price is required." };
  }

  const updated = updateDish({
    id,
    name,
    category,
    price: Number(price),
    spicy,
    tag,
    description,
    image,
  });

  revalidatePath("/admin");
  revalidatePath("/menu");
  revalidatePath(`/menu/${id}`);
  revalidatePath("/");
  return { ok: true, dish: updated };
}

/**
 * Admin Action: Insert daily raw materials and transport expenses
 */
export async function addDailyExpenseAction(formData) {
  const user = await getSession();
  if (!user || user.role !== "admin") {
    return { ok: false, error: "Unauthorized: Administrator permissions required." };
  }

  const date = formData.get("date");
  const rawMaterials = formData.get("rawMaterials");
  const transport = formData.get("transport");
  const note = formData.get("note");

  if (!date) {
    return { ok: false, error: "Date is required." };
  }

  const record = addDailyExpense({
    date,
    rawMaterials: Number(rawMaterials) || 0,
    transport: Number(transport) || 0,
    note: note || "",
  });

  revalidatePath("/admin");
  revalidatePath("/admin/finances");
  return { ok: true, record };
}

/**
 * Customer Action: Confirm that the food was received
 */
export async function confirmDeliveryAction(orderId) {
  const updated = confirmOrderReceived(orderId);
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  return { ok: true, order: updated };
}

/**
 * Customer Action: Submit review and ratings for a delivered order
 */
export async function submitOrderReviewAction(formData) {
  const orderId = formData.get("orderId");
  const rating = formData.get("rating");
  const comment = formData.get("comment");

  if (!orderId) {
    return { ok: false, error: "Order ID missing." };
  }

  const updated = submitOrderReview(orderId, rating, comment);
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  revalidatePath("/admin");
  revalidatePath("/menu");
  revalidatePath("/favorites");
  return { ok: true, order: updated };
}


export async function claimAndStartDeliveryAction(orderId) {
  const user = await getSession();
  if (!user || (user.role !== "delivery" && user.role !== "admin")) {
    return { ok: false, error: "Unauthorized: Delivery courier account required to claim order." };
  }
  const res = claimAndStartDelivery(orderId, user.id, user.name);
  if (res.ok) {
    revalidatePath("/delivery");
    revalidatePath("/admin");
    revalidatePath("/kitchen");
    revalidatePath(`/orders/${orderId}`);
  }
  return res;
}

export async function completeDeliveryAction(orderId) {
  const user = await getSession();
  if (!user || user.role !== "delivery") {
    return { ok: false, error: "Unauthorized: Only the assigned delivery courier can mark an order delivered." };
  }
  const res = completeDelivery(orderId, user.id);
  if (res.ok) {
    revalidatePath("/delivery");
    revalidatePath("/admin");
    revalidatePath(`/orders/${orderId}`);
  }
  return res;
}

export async function adminEditOrderAction(formData) {
  const user = await getSession();
  if (!user || user.role !== "admin") {
    return { ok: false, error: "Unauthorized: Administrator permissions required." };
  }
  const id = formData.get("id");
  const phone = formData.get("phone");
  const location = formData.get("location");
  const note = formData.get("note");
  const res = adminEditOrderRecord(id, { phone, location, note }, user.name);
  if (res.ok) {
    revalidatePath("/admin");
    revalidatePath("/orders");
    revalidatePath(`/orders/${id}`);
    revalidatePath("/kitchen");
    revalidatePath("/delivery");
  }
  return res;
}
