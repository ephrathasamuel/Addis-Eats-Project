"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  validateCustomerRegistration,
  parseDeliveryCoordinates,
  validateOrder,
  validateSignIn,
} from "@/lib/validation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createOrder,
  getLocationDriveTime,
  getLocationFee,
  getOrderForUser,
  getDeliveryOrdersFor,
  toOrderClientData,
  cancelOrderRecord,
  updateKitchenOrderStatus,
  confirmOrderReceived,
  submitOrderReview,
  claimAndStartDelivery,
  completeDelivery,
  adminEditOrderRecord,
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
  const deliveryCoordinates = parseDeliveryCoordinates(
    formData.get("deliveryLatitude"),
    formData.get("deliveryLongitude")
  );
  const finalLocation =
    selectedLocation === "Other Neighborhood" && customLocation?.trim()
      ? customLocation.trim()
      : selectedLocation;

  let items = [];
  try {
    items = JSON.parse(itemsRaw || "[]");
  } catch {
    items = [];
  }

  const { valid, fieldErrors } = validateOrder({ name, phone, items });
  if (deliveryCoordinates === false) {
    fieldErrors.deliveryCoordinates = "Choose a valid delivery location or leave the map pin unset.";
  }

  if (!valid || deliveryCoordinates === false) {
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
  if (!session) {
    const checkoutParams = new URLSearchParams();
    checkoutParams.set("items", itemsRaw || "[]");
    checkoutParams.set("name", name || "");
    checkoutParams.set("phone", phone || "");
    checkoutParams.set("location", finalLocation || "Bole");
    const checkoutPath = `/checkout?${checkoutParams}`;
    redirect(`/signin?next=${encodeURIComponent(checkoutPath)}`);
  }

  const order = createOrder({
    userId: session.id,
    name,
    phone,
    items,
    location: finalLocation,
    estimatedEta: getLocationDriveTime(finalLocation),
    deliveryFee: getLocationFee(finalLocation),
    deliveryCoordinates,
  });

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
  if (user.role !== "customer") {
    return { ok: false, status: 403, error: "Only the customer who placed the order can cancel it." };
  }
  if (!getOrderForUser(orderId, user.id, user.role)) {
    return { ok: false, status: 404, error: "Order not found." };
  }

  const res = cancelOrderRecord(orderId, user.id);
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  return res.ok ? { ok: true } : res;
}

/**
 * Sign In Server Action
 * Issues an httpOnly session cookie and validates destination to stop open-redirects.
 */
export async function signIn(formData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const rawNext = formData.get("next") || "/";

  const { valid, fieldErrors } = validateSignIn({ email, password });

  if (!valid) {
    const params = new URLSearchParams();
    params.set("email", email);
    params.set("next", rawNext);
    params.set("error", JSON.stringify(fieldErrors));
    redirect(`/signin?${params.toString()}`);
  }

  let user = null;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error) {
        user = await getSession();
      }
    } catch {}
  }

  // If not authenticated via Supabase (or Supabase not configured), check demo / local fallback
  if (!user) {
    const emailLower = email.toLowerCase();
    const isAdmin = emailLower.includes("admin");
    const isDelivery = emailLower.includes("delivery") || emailLower.includes("courier") || emailLower.includes("driver");
    const isStaff = !isAdmin && !isDelivery && (emailLower.includes("staff") || emailLower.includes("chef") || emailLower.includes("kitchen"));
    const role = isAdmin ? "admin" : isDelivery ? "delivery" : isStaff ? "staff" : "customer";

    const name = isAdmin
      ? "System Admin"
      : isDelivery
      ? "Abebe Courier"
      : isStaff
      ? "Chef Kassahun"
      : emailLower === "almaz@example.com"
      ? "Almaz"
      : email.split("@")[0] || "Demo User";

    const userId = isAdmin
      ? "usr_admin"
      : isDelivery
      ? "usr_courier_abebe"
      : isStaff
      ? "usr_chef_kassahun"
      : `usr_${encodeURIComponent(name.toLowerCase().replace(/\s+/g, "_"))}`;

    // If Supabase was configured and failed, but wasn't a demo account, show incorrect email/password
    if (isSupabaseConfigured() && !isAdmin && !isDelivery && !isStaff && emailLower !== "almaz@example.com") {
      const params = new URLSearchParams({ email, next: String(rawNext), error: "Email or password is incorrect." });
      redirect(`/signin?${params.toString()}`);
    }

    user = await createSession({
      id: userId,
      name,
      email,
      role,
    });
  }

  let safeNext = "/";
  if (typeof rawNext === "string" && rawNext.startsWith("/") && !rawNext.startsWith("//")) {
    safeNext = rawNext;
  }

  if (safeNext === "/" || safeNext === "/orders") {
    if (user.role === "admin") {
      safeNext = "/admin";
    } else if (user.role === "staff") {
      safeNext = "/kitchen";
    } else if (user.role === "delivery") {
      safeNext = "/delivery";
    }
  }

  redirect(safeNext);
}

export async function signUp(formData) {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const rawNext = formData.get("next") || "/orders";
  const { valid, fieldErrors } = validateCustomerRegistration({ name, email, password });

  if (!valid) {
    const params = new URLSearchParams({
      mode: "register",
      name,
      email,
      next: String(rawNext),
      error: JSON.stringify(fieldErrors),
    });
    redirect(`/signin?${params.toString()}`);
  }

  const safeNext =
    typeof rawNext === "string" && rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : "/orders";

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001"}/auth/callback?next=${encodeURIComponent(safeNext)}`,
        },
      });
      if (error) {
        const params = new URLSearchParams({
          mode: "register",
          name,
          email,
          next: String(rawNext),
          error: "Account creation failed. Check that Supabase email/password sign-up is enabled and try again.",
        });
        redirect(`/signin?${params.toString()}`);
      }

      if (!data.session) {
        redirect(`/signin?registered=1&email=${encodeURIComponent(email)}`);
      }

      const user = await getSession();
      if (user) {
        redirect(safeNext);
      }
    } catch {}
  }

  // Fallback local registration
  await createSession({
    id: `usr_${Date.now()}`,
    name,
    email,
    role: "customer",
  });

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
  if (!user || (user.role !== "staff" && user.role !== "admin")) {
    return { ok: false, status: 403, error: "Unauthorized: Kitchen staff permission required." };
  }

  const result = updateKitchenOrderStatus(orderId, newStatus, user.id, user.role === "admin");
  if (!result.ok) return result;
  revalidatePath("/kitchen");
  revalidatePath("/delivery");
  revalidatePath("/admin");
  revalidatePath(`/orders/${orderId}`);
  return { ok: true, order: { id: result.order.id, status: result.order.status } };
}

export async function updateDeliveryStatus(orderId, newStatus) {
  return updateKitchenStatus(orderId, newStatus);
}

/**
 * Admin Action: Toggle Sold Out status on a dish
 */
export async function toggleSoldOutAction(dishId) {
  const user = await getSession();
  if (!user || user.role !== "admin") {
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
  if (!user || user.role !== "admin") {
    return { ok: false, error: "Unauthorized: Admin permission required." };
  }

  removeDish(dishId);
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
  if (!user || user.role !== "admin") {
    return { ok: false, error: "Unauthorized: Admin permission required." };
  }

  restoreDish(dishId);
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
  const user = await getSession();
  if (!user) return { ok: false, status: 401, error: "Authentication required." };
  if (user.role !== "customer") {
    return { ok: false, status: 403, error: "Only the customer who placed the order can confirm receipt." };
  }
  if (!getOrderForUser(orderId, user.id, user.role)) {
    return { ok: false, status: 404, error: "Order not found." };
  }

  const updated = confirmOrderReceived(orderId);
  if (!updated) return { ok: false, status: 404, error: "Order not found." };
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  return { ok: true };
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

  const user = await getSession();
  if (!user) return { ok: false, status: 401, error: "Authentication required." };
  if (user.role !== "customer") {
    return { ok: false, status: 403, error: "Only customers can review their own orders." };
  }
  if (!getOrderForUser(orderId, user.id, user.role)) {
    return { ok: false, status: 404, error: "Order not found." };
  }
  const parsedRating = Number(rating);
  if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
    return { ok: false, status: 400, error: "Rating must be an integer from 1 to 5." };
  }
  if (String(comment || "").length > 1000) {
    return { ok: false, status: 400, error: "Review comments must be 1000 characters or fewer." };
  }

  const updated = submitOrderReview(orderId, parsedRating, String(comment || "").trim());
  if (!updated) return { ok: false, status: 409, error: "Reviews are available once after the order is delivered." };
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  revalidatePath("/admin");
  revalidatePath("/menu");
  revalidatePath("/favorites");
  return { ok: true };
}


export async function claimAndStartDeliveryAction(orderId) {
  const user = await getSession();
  if (!user || user.role !== "delivery") {
    return { ok: false, error: "Unauthorized: Delivery courier account required to claim order." };
  }
  const res = claimAndStartDelivery(orderId, user.id, user.name);
  if (res.ok) {
    revalidatePath("/delivery");
    revalidatePath("/admin");
    revalidatePath("/kitchen");
    revalidatePath(`/orders/${orderId}`);
  }
  if (!res.ok) return res;
  const order = getDeliveryOrdersFor(user.id).find((delivery) => String(delivery.id) === String(orderId));
  return order
    ? { ok: true, order }
    : { ok: false, error: "Order was claimed but could not be loaded for the courier." };
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
  return res.ok ? { ok: true } : res;
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
  return res.ok
    ? { ok: true, order: toOrderClientData(res.order) }
    : res;
}
