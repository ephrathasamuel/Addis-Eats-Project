"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  validateCustomerRegistration,
  normalizeEthiopianPhone,
  parseDeliveryCoordinates,
  validateOrder,
  validateSignIn,
} from "@/lib/validation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createOrder,
  priceOrderItems,
  getOrderForUser,
  getDeliveryOrdersFor,
  toOrderClientData,
  cancelOrderRecord,
  claimKitchenOrders,
  markKitchenReady,
  releaseKitchenOrder,
  confirmOrderReceived,
  submitOrderReview,
  claimAndStartDelivery,
  completeDelivery,
  adminEditOrderRecord,
} from "@/lib/orders";
import { getSession, createSession, clearSession, toSessionUser } from "@/lib/session";
import {
  authenticate,
  changeOwnPassword,
  createAccount,
  findAccountByEmail,
  getAccount,
  removeAccount,
  setPassword,
  setPin,
  toPublicAccount,
  updateProfile,
  verifyPin,
  STAFF_ROLES,
} from "@/lib/accounts";
import {
  setDishSoldOut,
  removeDish,
  restoreDish,
  addDish,
  updateDish,
  DISH_CATEGORIES,
} from "@/lib/dishes";
import { resolveImageInput } from "@/lib/media";
import { addDailyExpense } from "@/lib/finances";
import { getKitchenSnapshot } from "@/lib/kitchen";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safePath(value, fallback) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : fallback;
}

const ROLE_HOME = { admin: "/admin", staff: "/kitchen", delivery: "/delivery", customer: "/menu" };
const ROLE_AREAS = {
  admin: ["/admin", "/kitchen", "/delivery", "/dashboard", "/track", "/orders", "/profile", "/menu"],
  staff: ["/kitchen", "/profile", "/menu"],
  delivery: ["/delivery", "/track", "/profile", "/menu"],
  customer: ["/menu", "/orders", "/checkout", "/cart", "/track", "/favorites", "/profile"],
};

// Sends each role somewhere it is allowed to be, honouring ?next= when it fits.
function destinationFor(role, rawNext) {
  const next = safePath(rawNext, "");
  const allowed = ROLE_AREAS[role] || ROLE_AREAS.customer;
  if (next && next !== "/" && allowed.some((area) => next === area || next.startsWith(`${area}/`) || next.startsWith(`${area}?`))) {
    return next;
  }
  return ROLE_HOME[role] || "/menu";
}

function signInUrl(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, String(value));
  }
  return `/signin?${search.toString()}`;
}

async function getOrigin() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") || headerList.get("host");
  if (host) {
    const proto =
      headerList.get("x-forwarded-proto") ||
      (host.startsWith("localhost") || host.startsWith("127.") || host.startsWith("10.") ? "http" : "https");
    return `${proto}://${host}`;
  }
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

async function requireRole(...roles) {
  const user = await getSession();
  if (!user || !roles.includes(user.role)) return null;
  return user;
}

function revalidateMenu(dishId) {
  revalidatePath("/menu");
  revalidatePath("/");
  if (dishId) revalidatePath(`/menu/${dishId}`);
}

// ---------------------------------------------------------------------------
// Orders (customer)
// ---------------------------------------------------------------------------

/**
 * Place Order. Returns { ok: false, error?, fieldErrors? } on validation
 * problems, or redirects to the confirmation page on success. Prices and
 * fees are recomputed on the server from the live menu.
 */
export async function placeOrder(formData) {
  const session = await getSession();
  if (!session) {
    return { ok: false, error: "Your session expired. Please sign in again.", signIn: true };
  }
  if (session.role !== "customer") {
    return { ok: false, error: "Orders can only be placed from a customer account." };
  }

  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "");
  const addressDetails = String(formData.get("addressDetails") || "").trim();
  const selectedLocation = String(formData.get("location") || "Bole");
  const customLocation = String(formData.get("customLocation") || "").trim();
  const finalLocation =
    selectedLocation === "Other Neighborhood" ? customLocation || "Other Neighborhood" : selectedLocation;

  let rawItems = [];
  try {
    rawItems = JSON.parse(String(formData.get("items") || "[]"));
  } catch {
    rawItems = [];
  }

  const { valid, fieldErrors } = validateOrder({ name, phone, items: rawItems, addressDetails });
  if (selectedLocation === "Other Neighborhood" && !customLocation) {
    fieldErrors.location = "Please specify your neighborhood or landmark.";
  }
  const deliveryCoordinates = parseDeliveryCoordinates(
    formData.get("deliveryLatitude"),
    formData.get("deliveryLongitude")
  );
  if (deliveryCoordinates === false) {
    fieldErrors.deliveryCoordinates = "That map pin is outside our Addis Ababa delivery area. Remove it or try again.";
  }
  if (!valid || Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  const priced = priceOrderItems(rawItems);
  if (!priced.ok) {
    return { ok: false, error: priced.error };
  }

  const order = createOrder({
    userId: session.id,
    name,
    phone: normalizeEthiopianPhone(phone),
    items: priced.items,
    foodTotal: priced.foodTotal,
    location: finalLocation,
    addressDetails,
    deliveryCoordinates,
  });

  redirect(`/checkout/confirmation?order=${order.id}`);
}

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
  return res.ok ? { ok: true } : res;
}

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
  if (!updated) return { ok: false, status: 409, error: "This order has not been marked delivered yet." };
  return { ok: true };
}

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
  revalidateMenu();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

/**
 * Email + password sign-in for everyone. Staff and admin accounts live in the
 * local account store; customers use Supabase when it is configured.
 */
export async function signIn(formData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const rawNext = formData.get("next") || "";

  const { valid, fieldErrors } = validateSignIn({ email, password });
  if (!valid) {
    redirect(signInUrl({ email, next: rawNext, error: JSON.stringify(fieldErrors) }));
  }

  let role = null;
  let errorMessage = "Incorrect email or password.";

  if (findAccountByEmail(email) || !isSupabaseConfigured()) {
    const result = authenticate(email, password);
    if (result.ok) {
      await createSession(result.account);
      role = result.account.role;
    } else {
      errorMessage = result.error;
    }
  } else {
    try {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error && data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .maybeSingle();
        role = profile?.role || "customer";
      } else if (error?.code === "email_not_confirmed") {
        errorMessage = "Confirm your email address first, then sign in.";
      }
    } catch {
      errorMessage = "The sign-in service is unavailable. Please try again.";
    }
  }

  if (!role) {
    redirect(signInUrl({ email, next: rawNext, error: errorMessage }));
  }
  redirect(destinationFor(role, rawNext));
}

/**
 * Google sign-in through Supabase OAuth. Google shows its own account chooser
 * (prompt=select_account), and the profile name comes from the Google account.
 */
export async function signInWithGoogle(formData) {
  const next = safePath(formData?.get?.("next"), "/menu");
  if (!isSupabaseConfigured()) {
    redirect(signInUrl({ next, error: "Google sign-in is not configured on this server." }));
  }

  let url = null;
  try {
    const supabase = await createSupabaseServerClient();
    const origin = await getOrigin();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (!error) url = data?.url || null;
  } catch {
    url = null;
  }

  // redirect() works by throwing, so it must stay outside the try/catch above.
  if (!url) {
    redirect(signInUrl({ next, error: "Google sign-in is unavailable. Check that the Google provider is enabled in Supabase." }));
  }
  redirect(url);
}

/**
 * Customer self-registration. Staff accounts cannot be created here.
 */
export async function signUp(formData) {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const rawNext = formData.get("next") || "";
  const { valid, fieldErrors } = validateCustomerRegistration({ name, email, password });
  const back = (error) => redirect(signInUrl({ mode: "register", name, email, next: rawNext, error }));

  if (!valid) back(JSON.stringify(fieldErrors));
  const destination = destinationFor("customer", rawNext);

  if (findAccountByEmail(email)) {
    back(JSON.stringify({ email: "An account with this email already exists. Sign in instead." }));
  }

  if (isSupabaseConfigured()) {
    let result;
    try {
      const supabase = await createSupabaseServerClient();
      const origin = await getOrigin();
      result = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(destination)}`,
        },
      });
    } catch {
      result = { error: new Error("unavailable") };
    }
    if (result.error) {
      back("Account creation failed. The email may already be registered, or sign-up is disabled in Supabase.");
    }
    if (!result.data?.session) {
      redirect(`/signin?registered=1&email=${encodeURIComponent(email)}`);
    }
    redirect(destination);
  }

  const created = createAccount({ role: "customer", name, email, password });
  if (!created.ok) back(JSON.stringify(created.fieldErrors));
  await createSession(created.account);
  redirect(destination);
}

export async function signOut() {
  await clearSession();
  redirect("/");
}

// ---------------------------------------------------------------------------
// Profile (every signed-in user)
// ---------------------------------------------------------------------------

export async function changePasswordAction(formData) {
  const user = await getSession();
  if (!user) return { ok: false, error: "Please sign in again." };
  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");
  if (newPassword !== confirmPassword) return { ok: false, error: "The new passwords do not match." };

  if (user.provider === "supabase") {
    if (newPassword.length < 8) return { ok: false, error: "Password must be at least 8 characters." };
    try {
      const supabase = await createSupabaseServerClient();
      const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
      if (verifyError) return { ok: false, error: "Your current password is incorrect." };
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return { ok: false, error: "Could not update the password. Please try again." };
      return { ok: true };
    } catch {
      return { ok: false, error: "The account service is unavailable. Please try again." };
    }
  }

  const result = changeOwnPassword(user.id, currentPassword, newPassword);
  if (!result.ok) return result;
  // The password change invalidated every session, including this one; issue a fresh one.
  await createSession(result.account);
  return { ok: true };
}

export async function updateMyProfileAction(formData) {
  const user = await getSession();
  if (!user || user.provider !== "local") return { ok: false, error: "Profile details cannot be edited for this account." };
  const photoInput = formData.get("photo");
  let photo;
  if (photoInput) {
    const resolved = resolveImageInput(photoInput, "staff");
    if (!resolved.ok) return { ok: false, error: resolved.error };
    photo = resolved.url;
  }
  const result = updateProfile(user.id, {
    name: formData.get("name") ?? undefined,
    phone: formData.get("phone") ?? undefined,
    photo,
  });
  if (!result.ok) return { ok: false, fieldErrors: result.fieldErrors, error: result.error };
  await createSession(result.account);
  return { ok: true, user: toSessionUser(result.account) };
}

export async function changeMyPinAction(formData) {
  const user = await requireRole("staff");
  if (!user) return { ok: false, error: "Only kitchen staff have PINs." };
  const result = authenticate(user.email, String(formData.get("currentPassword") || ""));
  if (!result.ok) return { ok: false, error: "Your current password is incorrect." };
  return setPin(user.id, String(formData.get("pin") || ""));
}

// ---------------------------------------------------------------------------
// Kitchen
// ---------------------------------------------------------------------------

/**
 * Claim one or more waiting tickets.
 * - Personal device: the signed-in cook gets the credit.
 * - Shared kitchen tablet: pass { staffId, pin }; the cook who owns that PIN
 *   gets the credit, so nobody has to sign out and back in.
 */
export async function kitchenClaimAction({ orderIds, staffId, pin } = {}) {
  const user = await requireRole("staff", "admin");
  if (!user) return { ok: false, error: "Kitchen staff sign-in required." };
  const ids = Array.isArray(orderIds) ? orderIds.slice(0, 50).map(String) : [];
  if (ids.length === 0) return { ok: false, error: "Select at least one ticket." };

  let cook;
  if (staffId) {
    const check = verifyPin(staffId, pin);
    if (!check.ok) return { ok: false, error: check.error, pinError: true };
    cook = check.account;
  } else if (user.role === "staff") {
    cook = getAccount(user.id) || { id: user.id, name: user.name };
  } else {
    return { ok: false, error: "Pick the cook who is claiming these tickets." };
  }

  const results = claimKitchenOrders(ids, { id: cook.id, name: cook.name });
  return { ok: true, cook: { id: cook.id, name: cook.name }, results, snapshot: getKitchenSnapshot() };
}

export async function kitchenReadyAction(orderIds) {
  const user = await requireRole("staff", "admin");
  if (!user) return { ok: false, error: "Kitchen staff sign-in required." };
  const ids = (Array.isArray(orderIds) ? orderIds : [orderIds]).slice(0, 50).map(String);
  const results = markKitchenReady(ids);
  return { ok: true, results, snapshot: getKitchenSnapshot() };
}

export async function kitchenReleaseAction(orderId) {
  const user = await requireRole("staff", "admin");
  if (!user) return { ok: false, error: "Kitchen staff sign-in required." };
  const result = releaseKitchenOrder(orderId);
  return { ...result, snapshot: getKitchenSnapshot() };
}

/**
 * Kitchen staff and admins can mark dishes sold out / available.
 */
export async function setDishSoldOutAction(dishId, isSoldOut) {
  const user = await requireRole("staff", "admin");
  if (!user) return { ok: false, error: "Only kitchen staff or admins can change availability." };
  const dish = setDishSoldOut(String(dishId), typeof isSoldOut === "boolean" ? isSoldOut : undefined);
  if (!dish) return { ok: false, error: "Dish not found." };
  revalidateMenu(dish.id);
  return { ok: true, isSoldOut: dish.isSoldOut };
}

// Kept for the admin inventory list.
export async function toggleSoldOutAction(dishId) {
  return setDishSoldOutAction(dishId);
}

// ---------------------------------------------------------------------------
// Delivery
// ---------------------------------------------------------------------------

export async function claimAndStartDeliveryAction(orderId) {
  const user = await requireRole("delivery");
  if (!user) return { ok: false, error: "A courier account is required to claim orders." };
  const res = claimAndStartDelivery(orderId, user);
  return { ...res, order: undefined, orders: getDeliveryOrdersFor(user.id) };
}

export async function completeDeliveryAction(orderId) {
  const user = await requireRole("delivery");
  if (!user) return { ok: false, error: "Only the assigned courier can mark an order delivered." };
  const res = completeDelivery(orderId, user.id);
  return { ...res, order: undefined, orders: getDeliveryOrdersFor(user.id) };
}

// ---------------------------------------------------------------------------
// Admin: menu
// ---------------------------------------------------------------------------

function readDishForm(formData) {
  const price = Number(formData.get("price"));
  return {
    name: String(formData.get("name") || "").trim(),
    category: String(formData.get("category") || "").trim(),
    price,
    spicy: formData.get("spicy") === "true" || formData.get("spicy") === "on",
    tag: String(formData.get("tag") || "").trim().slice(0, 40),
    description: String(formData.get("description") || "").trim().slice(0, 500),
    image: formData.get("image"),
  };
}

function validateDish(dish) {
  if (!dish.name || dish.name.length > 80) return "Dish name is required (up to 80 characters).";
  if (!Number.isFinite(dish.price) || dish.price <= 0 || dish.price > 100000) return "A valid positive price in ETB is required.";
  if (dish.category && !DISH_CATEGORIES.includes(dish.category)) return "Choose a valid category.";
  return null;
}

export async function addDishAction(formData) {
  if (!(await requireRole("admin"))) return { ok: false, error: "Administrator permissions required." };
  const input = readDishForm(formData);
  const error = validateDish(input);
  if (error) return { ok: false, error };
  const image = resolveImageInput(input.image, "dish");
  if (!image.ok) return { ok: false, error: image.error };

  const newDish = addDish({ ...input, category: input.category || "Traditional", image: image.url });
  revalidateMenu(newDish.id);
  return { ok: true, dish: newDish };
}

export async function editDishAction(formData) {
  if (!(await requireRole("admin"))) return { ok: false, error: "Administrator permissions required." };
  const id = String(formData.get("id") || "");
  if (!id) return { ok: false, error: "Dish ID is missing." };
  const input = readDishForm(formData);
  const error = validateDish(input);
  if (error) return { ok: false, error };
  const image = resolveImageInput(input.image, "dish");
  if (!image.ok) return { ok: false, error: image.error };

  const updated = updateDish({ id, ...input, image: image.url || undefined });
  if (!updated) return { ok: false, error: "Dish not found." };
  revalidateMenu(id);
  return { ok: true, dish: updated };
}

export async function removeDishAction(dishId) {
  if (!(await requireRole("admin"))) return { ok: false, error: "Administrator permissions required." };
  if (!removeDish(dishId)) return { ok: false, error: "Dish not found." };
  revalidateMenu(dishId);
  return { ok: true, isRemoved: true };
}

export async function restoreDishAction(dishId) {
  if (!(await requireRole("admin"))) return { ok: false, error: "Administrator permissions required." };
  if (!restoreDish(dishId)) return { ok: false, error: "Dish not found." };
  revalidateMenu(dishId);
  return { ok: true, isRemoved: false };
}

// ---------------------------------------------------------------------------
// Admin: finances and orders
// ---------------------------------------------------------------------------

export async function addDailyExpenseAction(formData) {
  if (!(await requireRole("admin"))) return { ok: false, error: "Administrator permissions required." };
  const date = String(formData.get("date") || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: "Date is required." };

  const record = addDailyExpense({
    date,
    rawMaterials: Math.max(0, Number(formData.get("rawMaterials")) || 0),
    transport: Math.max(0, Number(formData.get("transport")) || 0),
    note: String(formData.get("note") || "").slice(0, 300),
  });
  revalidatePath("/admin");
  revalidatePath("/admin/finances");
  return { ok: true, record };
}

export async function adminEditOrderAction(formData) {
  const user = await requireRole("admin");
  if (!user) return { ok: false, error: "Administrator permissions required." };
  const id = formData.get("id");
  const phone = formData.get("phone");
  if (phone && !normalizeEthiopianPhone(phone)) return { ok: false, error: "Enter a valid Ethiopian phone number." };
  const res = adminEditOrderRecord(
    id,
    { phone: phone ? normalizeEthiopianPhone(phone) : "", location: formData.get("location"), note: formData.get("note") },
    user.name
  );
  return res.ok ? { ok: true, order: toOrderClientData(res.order) } : res;
}

// ---------------------------------------------------------------------------
// Admin: staff accounts
// ---------------------------------------------------------------------------

export async function createStaffAction(formData) {
  if (!(await requireRole("admin"))) return { ok: false, error: "Administrator permissions required." };
  const role = String(formData.get("role") || "");
  let photo = "";
  const photoInput = formData.get("photo");
  if (photoInput) {
    const resolved = resolveImageInput(photoInput, "staff");
    if (!resolved.ok) return { ok: false, fieldErrors: { photo: resolved.error } };
    photo = resolved.url;
  }
  const result = createAccount({
    role: STAFF_ROLES.includes(role) ? role : "",
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    photo,
    password: String(formData.get("password") || ""),
    pin: String(formData.get("pin") || ""),
  });
  if (!result.ok) return result;
  revalidatePath("/admin/staff");
  return { ok: true, staff: toPublicAccount(result.account) };
}

function getStaffAccount(staffId) {
  const account = getAccount(String(staffId || ""));
  return account && STAFF_ROLES.includes(account.role) ? account : null;
}

export async function resetStaffPasswordAction(staffId, newPassword) {
  if (!(await requireRole("admin"))) return { ok: false, error: "Administrator permissions required." };
  if (!getStaffAccount(staffId)) return { ok: false, error: "Staff member not found." };
  const result = setPassword(staffId, String(newPassword || ""));
  return result.ok ? { ok: true } : result;
}

export async function resetStaffPinAction(staffId, pin) {
  if (!(await requireRole("admin"))) return { ok: false, error: "Administrator permissions required." };
  if (!getStaffAccount(staffId)) return { ok: false, error: "Staff member not found." };
  return setPin(staffId, String(pin || ""));
}

export async function removeStaffAction(staffId) {
  if (!(await requireRole("admin"))) return { ok: false, error: "Administrator permissions required." };
  if (!getStaffAccount(staffId)) return { ok: false, error: "Staff member not found." };
  const result = removeAccount(staffId);
  revalidatePath("/admin/staff");
  return result;
}
