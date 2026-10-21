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
import { findAuthUserByEmail } from "@/lib/supabase/admin";
import {
  createOrder,
  priceOrderItems,
  getOrderForUser,
  getDeliveryOrdersFor,
  getOrder,
  toOrderClientData,
  cancelOrderRecord,
  claimKitchenOrders,
  markKitchenReady,
  releaseKitchenOrder,
  confirmOrderReceived,
  submitOrderReview,
  editOrderReview,
  claimAndStartDelivery,
  startDeliveryJourney,
  releaseDelivery,
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
import { saveDailyExpense } from "@/lib/finances";
import { describeDrive, estimateDrive } from "@/lib/routing";
import { quoteDelivery } from "@/lib/pricing";
import { notifyRole, notifyUser } from "@/lib/push";

// Tells the customer who placed an order about a status change.
function notifyCustomer(orderId, title, body) {
  const order = getOrder(orderId);
  if (order) notifyUser(order.userId, { title, body, url: `/orders/${order.id}`, tag: `order-${order.id}` });
}
import { flushData, syncData } from "@/lib/datastore";
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

function signInUrl(params, page = "/signin") {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, String(value));
  }
  return `${page}?${search.toString()}`;
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
async function placeOrderImpl(formData) {
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

  const driveEstimate = deliveryCoordinates ? await estimateDrive(deliveryCoordinates) : null;
  const quote = await quoteDelivery({ location: finalLocation, pinEstimate: driveEstimate });
  const order = createOrder({
    userId: session.id,
    name,
    phone: normalizeEthiopianPhone(phone),
    items: priced.items,
    foodTotal: priced.foodTotal,
    location: finalLocation,
    addressDetails,
    deliveryCoordinates,
    driveEstimate,
    quote,
  });

  notifyRole("staff", {
    title: `New order #${order.id}`,
    body: order.items.map((item) => `${item.qty}× ${item.name}`).join(", "),
    url: "/kitchen",
    tag: "kitchen-new",
  });
  redirect(`/checkout/confirmation?order=${order.id}`);
}

/** Driving estimate for the checkout once the customer attaches their location. */
async function estimateDeliveryImpl(latitude, longitude) {
  const coordinates = parseDeliveryCoordinates(latitude, longitude);
  if (!coordinates) return { ok: false };
  const estimate = await estimateDrive(coordinates);
  if (!estimate) return { ok: false };
  const quote = await quoteDelivery({ pinEstimate: estimate });
  return { ok: true, estimate, text: describeDrive(estimate), fee: quote.fee };
}

async function cancelOrderImpl(orderId) {
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

async function confirmDeliveryActionImpl(orderId) {
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

async function submitOrderReviewActionImpl(formData) {
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
async function editOrderReviewActionImpl(formData) {
  const orderId = formData.get("orderId");
  const user = await getSession();
  if (!user || user.role !== "customer") return { ok: false, error: "Only the customer who placed the order can edit its review." };
  if (!getOrderForUser(orderId, user.id, user.role)) return { ok: false, error: "Order not found." };
  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") || "").trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { ok: false, error: "Rating must be from 1 to 5 stars." };
  if (comment.length > 1000) return { ok: false, error: "Review comments must be 1000 characters or fewer." };
  const result = editOrderReview(orderId, rating, comment);
  if (!result.ok) return result;
  revalidateMenu();
  return { ok: true };
}

const NO_ACCOUNT_MESSAGE = "There's no account with this email yet. Create an account to get started.";
const STAFF_ON_CUSTOMER_PAGE = "This is a restaurant staff account. Please sign in on the staff sign-in page.";

/**
 * Customer sign-in (/signin). Staff and admin accounts are sent to the staff
 * sign-in page instead, so the two never overlap.
 */
async function signInImpl(formData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const rawNext = formData.get("next") || "";

  const { valid, fieldErrors } = validateSignIn({ email, password });
  if (!valid) {
    redirect(signInUrl({ email, next: rawNext, error: JSON.stringify(fieldErrors) }));
  }

  const local = findAccountByEmail(email);
  if (local && local.role !== "customer") {
    redirect(signInUrl({ email, error: STAFF_ON_CUSTOMER_PAGE, hint: "staff" }));
  }

  let role = null;
  let errorMessage = "Incorrect password. Please try again.";
  let hint = "";

  if (local || !isSupabaseConfigured()) {
    if (!local) {
      redirect(signInUrl({ email, next: rawNext, error: NO_ACCOUNT_MESSAGE, hint: "register" }));
    }
    const result = authenticate(email, password);
    if (result.ok) {
      await createSession(result.account);
      role = result.account.role;
    } else {
      errorMessage = result.error === "Incorrect email or password." ? "Incorrect password. Please try again." : result.error;
    }
  } else {
    let failure = null;
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
      } else {
        failure = error?.code || "invalid_credentials";
      }
    } catch {
      errorMessage = "The sign-in service is unavailable. Please try again.";
    }

    if (failure === "email_not_confirmed") {
      errorMessage = "Please confirm your email first: open the link we emailed you, then sign in.";
    } else if (failure) {
      // Explain the failure instead of a generic "invalid credentials".
      const existing = await findAuthUserByEmail(email);
      if (existing && !existing.exists) {
        errorMessage = NO_ACCOUNT_MESSAGE;
        hint = "register";
      } else if (existing?.exists && !existing.providers.includes("email") && existing.providers.includes("google")) {
        errorMessage = "This email signed up with Google. Use \"Continue with Google\" below.";
        hint = "google";
      } else if (!existing) {
        errorMessage = "Incorrect email or password. If you're new, create an account first.";
        hint = "register";
      }
    }
  }

  if (!role) {
    redirect(signInUrl({ email, next: rawNext, error: errorMessage, hint }));
  }
  redirect(destinationFor(role, rawNext));
}

/**
 * Restaurant staff sign-in (/staff/signin): admin, kitchen and delivery only.
 * Staff accounts are created by the admin; there is no sign-up here.
 */
async function staffSignInImpl(formData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const rawNext = formData.get("next") || "";
  const back = (params) => redirect(signInUrl({ email, next: rawNext, ...params }, "/staff/signin"));

  const { valid, fieldErrors } = validateSignIn({ email, password });
  if (!valid) back({ error: JSON.stringify(fieldErrors) });

  const local = findAccountByEmail(email);
  if (!local || local.role === "customer") {
    const customer = local || (await findAuthUserByEmail(email))?.exists;
    back(
      customer
        ? { error: "This page is only for restaurant staff. Customers sign in on the customer page.", hint: "customer" }
        : { error: "There's no staff account with this email. Ask the restaurant admin to create one for you." }
    );
  }

  const result = authenticate(email, password);
  if (!result.ok) {
    back({ error: result.error === "Incorrect email or password." ? "Incorrect password. Please try again." : result.error });
  }
  await createSession(result.account);
  redirect(destinationFor(result.account.role, rawNext));
}

/**
 * Google sign-in through Supabase OAuth. Google shows its own account chooser
 * (prompt=select_account), and the profile name comes from the Google account.
 */
async function signInWithGoogleImpl(formData) {
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
async function signUpImpl(formData) {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const rawNext = formData.get("next") || "";
  const { valid, fieldErrors } = validateCustomerRegistration({ name, email, password });
  const back = (error) => redirect(signInUrl({ mode: "register", name, email, next: rawNext, error }));

  if (!valid) back(JSON.stringify(fieldErrors));
  const destination = destinationFor("customer", rawNext);

  const existingLocal = findAccountByEmail(email);
  if (existingLocal) {
    back(
      JSON.stringify({
        email:
          existingLocal.role === "customer"
            ? "An account with this email already exists. Sign in instead."
            : "This email belongs to a restaurant staff account. Use a different email.",
      })
    );
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
      const messages = {
        email_address_invalid: "That email address was rejected. Please use a real email address.",
        user_already_exists: "An account with this email already exists. Sign in instead.",
        email_exists: "An account with this email already exists. Sign in instead.",
        weak_password: "That password is too weak. Use at least 8 characters with letters and numbers.",
        over_email_send_rate_limit: "Too many sign-ups right now. Please wait a few minutes and try again.",
        over_request_rate_limit: "Too many attempts. Please wait a few minutes and try again.",
        signup_disabled: "New sign-ups are currently turned off.",
      };
      back(messages[result.error.code] || "Account creation failed. Please try again in a moment.");
    }
    // With email confirmation on, Supabase answers an already-registered email
    // with a user that has no identities instead of an error.
    if (result.data?.user && Array.isArray(result.data.user.identities) && result.data.user.identities.length === 0) {
      back(JSON.stringify({ email: "An account with this email already exists. Sign in instead, or use Continue with Google." }));
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

async function signOutImpl() {
  const user = await getSession();
  await clearSession();
  redirect(user && user.role !== "customer" ? "/staff/signin" : "/");
}

// ---------------------------------------------------------------------------
// Profile (every signed-in user)
// ---------------------------------------------------------------------------

/**
 * Emails a link for choosing a new password (Supabase customer accounts).
 * Works both for "Forgot password?" and for Google accounts that want to add
 * a password. Always answers the same way, so it doesn't reveal which emails
 * have accounts.
 */
async function requestPasswordResetImpl(formData) {
  const session = await getSession();
  const email = String(formData?.get?.("email") || session?.email || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Enter a valid email address." };
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Password reset emails aren't available here. Please contact the restaurant." };
  }
  const local = findAccountByEmail(email);
  if (local && local.role !== "customer") {
    return { ok: false, error: "Staff passwords are reset by the restaurant admin." };
  }
  try {
    const supabase = await createSupabaseServerClient();
    const origin = await getOrigin();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
    });
    if (error?.code === "over_email_send_rate_limit" || error?.status === 429) {
      return { ok: false, error: "Too many emails were sent recently. Please wait a few minutes and try again." };
    }
  } catch {
    return { ok: false, error: "The email service is unavailable. Please try again." };
  }
  return { ok: true, email };
}

/** Sets a new password after the user opened the emailed link (they are signed in by it). */
async function setNewPasswordImpl(formData) {
  const user = await getSession();
  if (!user || user.provider !== "supabase") {
    return { ok: false, error: "This link has expired. Request a new password email." };
  }
  const password = String(formData.get("newPassword") || "");
  if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters." };
  if (password !== String(formData.get("confirmPassword") || "")) return { ok: false, error: "The passwords do not match." };
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      return {
        ok: false,
        error: error.code === "same_password" ? "Choose a password you haven't used before." : "Could not save the password. Request a new email and try again.",
      };
    }
  } catch {
    return { ok: false, error: "The account service is unavailable. Please try again." };
  }
  return { ok: true };
}

async function changePasswordActionImpl(formData) {
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

async function updateMyProfileActionImpl(formData) {
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

async function changeMyPinActionImpl(formData) {
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
async function kitchenClaimActionImpl({ orderIds, staffId, pin } = {}) {
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
  for (const result of results.filter((r) => r.ok)) {
    notifyCustomer(result.id, "Your food is being cooked", `A cook has started preparing order #${result.id}.`);
  }
  return { ok: true, cook: { id: cook.id, name: cook.name }, results, snapshot: getKitchenSnapshot() };
}

async function kitchenReadyActionImpl(orderIds) {
  const user = await requireRole("staff", "admin");
  if (!user) return { ok: false, error: "Kitchen staff sign-in required." };
  const ids = (Array.isArray(orderIds) ? orderIds : [orderIds]).slice(0, 50).map(String);
  const results = markKitchenReady(ids);
  for (const result of results.filter((r) => r.ok)) {
    const order = getOrder(result.id);
    notifyCustomer(result.id, "Your food is ready", `Order #${result.id} is packed and waiting for a courier.`);
    notifyRole("delivery", {
      title: `New pickup #${result.id}`,
      body: `${order?.location || "Addis Ababa"} · +${order?.deliveryFee || 0} ETB`,
      url: "/delivery",
      tag: "delivery-pool",
    });
  }
  return { ok: true, results, snapshot: getKitchenSnapshot() };
}

async function kitchenReleaseActionImpl(orderId) {
  const user = await requireRole("staff", "admin");
  if (!user) return { ok: false, error: "Kitchen staff sign-in required." };
  const result = releaseKitchenOrder(orderId);
  return { ...result, snapshot: getKitchenSnapshot() };
}

/**
 * Kitchen staff and admins can mark dishes sold out / available.
 */
async function setDishSoldOutActionImpl(dishId, isSoldOut) {
  const user = await requireRole("staff", "admin");
  if (!user) return { ok: false, error: "Only kitchen staff or admins can change availability." };
  const dish = setDishSoldOut(String(dishId), typeof isSoldOut === "boolean" ? isSoldOut : undefined);
  if (!dish) return { ok: false, error: "Dish not found." };
  revalidateMenu(dish.id);
  return { ok: true, isSoldOut: dish.isSoldOut };
}

// Kept for the admin inventory list.
async function toggleSoldOutActionImpl(dishId) {
  return setDishSoldOutAction(dishId);
}

// ---------------------------------------------------------------------------
// Delivery
// ---------------------------------------------------------------------------

async function claimAndStartDeliveryActionImpl(orderId) {
  const user = await requireRole("delivery");
  if (!user) return { ok: false, error: "A courier account is required to claim orders." };
  const res = claimAndStartDelivery(orderId, user);
  if (res.ok) notifyCustomer(orderId, "A courier has your order", `${user.name} is collecting order #${orderId}${user.phone ? ` (${user.phone})` : ""}.`);
  return { ...res, order: undefined, orders: getDeliveryOrdersFor(user.id) };
}

async function startDeliveryJourneyActionImpl(orderId) {
  const user = await requireRole("delivery");
  if (!user) return { ok: false, error: "Only the assigned courier can start this journey." };
  const res = startDeliveryJourney(orderId, user.id);
  if (res.ok) notifyCustomer(orderId, "Your food is on the way", `${user.name} is driving to you now. Track them on the live map.`);
  return { ...res, order: undefined, orders: getDeliveryOrdersFor(user.id) };
}

async function releaseDeliveryActionImpl(orderId) {
  const user = await requireRole("delivery");
  if (!user) return { ok: false, error: "Only the assigned courier can hand this order back." };
  const res = releaseDelivery(orderId, user.id);
  return { ...res, orders: getDeliveryOrdersFor(user.id) };
}

async function completeDeliveryActionImpl(orderId) {
  const user = await requireRole("delivery");
  if (!user) return { ok: false, error: "Only the assigned courier can mark an order delivered." };
  const res = completeDelivery(orderId, user.id);
  if (res.ok) notifyCustomer(orderId, "Delivered. Enjoy your meal!", `Order #${orderId} has arrived. Please confirm you received it.`);
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

async function addDishActionImpl(formData) {
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

async function editDishActionImpl(formData) {
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

async function removeDishActionImpl(dishId) {
  if (!(await requireRole("admin"))) return { ok: false, error: "Administrator permissions required." };
  if (!removeDish(dishId)) return { ok: false, error: "Dish not found." };
  revalidateMenu(dishId);
  return { ok: true, isRemoved: true };
}

async function restoreDishActionImpl(dishId) {
  if (!(await requireRole("admin"))) return { ok: false, error: "Administrator permissions required." };
  if (!restoreDish(dishId)) return { ok: false, error: "Dish not found." };
  revalidateMenu(dishId);
  return { ok: true, isRemoved: false };
}

// ---------------------------------------------------------------------------
// Admin: finances and orders
// ---------------------------------------------------------------------------

// Costs for any past day; changing a recorded day needs a reason (kept in its history).
async function addDailyExpenseActionImpl(formData) {
  const user = await requireRole("admin");
  if (!user) return { ok: false, error: "Administrator permissions required." };
  const result = saveDailyExpense({
    date: String(formData.get("date") || ""),
    rawMaterials: formData.get("rawMaterials"),
    transport: formData.get("transport"),
    note: formData.get("note"),
    reason: formData.get("reason"),
    by: user.name,
  });
  if (!result.ok) return result;
  revalidatePath("/admin");
  revalidatePath("/admin/finances");
  return result;
}

async function adminEditOrderActionImpl(formData) {
  const user = await requireRole("admin");
  if (!user) return { ok: false, error: "Administrator permissions required." };
  const id = formData.get("id");
  const phone = formData.get("phone");
  if (phone && !normalizeEthiopianPhone(phone)) return { ok: false, error: "Enter a valid Ethiopian phone number." };
  const location = String(formData.get("location") || "");
  const res = adminEditOrderRecord(
    id,
    {
      phone: phone ? normalizeEthiopianPhone(phone) : "",
      location,
      note: formData.get("note"),
      quote: location ? await quoteDelivery({ location }) : null,
    },
    user.name
  );
  return res.ok ? { ok: true, order: toOrderClientData(res.order) } : res;
}

// ---------------------------------------------------------------------------
// Admin: staff accounts
// ---------------------------------------------------------------------------

async function createStaffActionImpl(formData) {
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

async function resetStaffPasswordActionImpl(staffId, newPassword) {
  if (!(await requireRole("admin"))) return { ok: false, error: "Administrator permissions required." };
  if (!getStaffAccount(staffId)) return { ok: false, error: "Staff member not found." };
  const result = setPassword(staffId, String(newPassword || ""));
  return result.ok ? { ok: true } : result;
}

async function resetStaffPinActionImpl(staffId, pin) {
  if (!(await requireRole("admin"))) return { ok: false, error: "Administrator permissions required." };
  if (!getStaffAccount(staffId)) return { ok: false, error: "Staff member not found." };
  return setPin(staffId, String(pin || ""));
}

async function removeStaffActionImpl(staffId) {
  if (!(await requireRole("admin"))) return { ok: false, error: "Administrator permissions required." };
  if (!getStaffAccount(staffId)) return { ok: false, error: "Staff member not found." };
  const result = removeAccount(staffId);
  revalidatePath("/admin/staff");
  return result;
}

// ---------------------------------------------------------------------------
// Exported actions
// ---------------------------------------------------------------------------

// Every action reads the latest shared data first and finishes saving its
// changes before it returns or redirects, so the next request (possibly on
// another server instance) sees them.
async function withData(run) {
  await syncData();
  try {
    return await run();
  } finally {
    await flushData();
  }
}

export async function placeOrder(...args) {
  return withData(() => placeOrderImpl(...args));
}

export async function estimateDelivery(...args) {
  return withData(() => estimateDeliveryImpl(...args));
}

export async function cancelOrder(...args) {
  return withData(() => cancelOrderImpl(...args));
}

export async function confirmDeliveryAction(...args) {
  return withData(() => confirmDeliveryActionImpl(...args));
}

export async function editOrderReviewAction(...args) {
  return withData(() => editOrderReviewActionImpl(...args));
}

export async function submitOrderReviewAction(...args) {
  return withData(() => submitOrderReviewActionImpl(...args));
}

export async function signIn(...args) {
  return withData(() => signInImpl(...args));
}

export async function staffSignIn(...args) {
  return withData(() => staffSignInImpl(...args));
}

export async function signInWithGoogle(...args) {
  return withData(() => signInWithGoogleImpl(...args));
}

export async function signUp(...args) {
  return withData(() => signUpImpl(...args));
}

export async function signOut(...args) {
  return withData(() => signOutImpl(...args));
}

export async function requestPasswordReset(...args) {
  return withData(() => requestPasswordResetImpl(...args));
}

export async function setNewPassword(...args) {
  return withData(() => setNewPasswordImpl(...args));
}

export async function changePasswordAction(...args) {
  return withData(() => changePasswordActionImpl(...args));
}

export async function updateMyProfileAction(...args) {
  return withData(() => updateMyProfileActionImpl(...args));
}

export async function changeMyPinAction(...args) {
  return withData(() => changeMyPinActionImpl(...args));
}

export async function kitchenClaimAction(...args) {
  return withData(() => kitchenClaimActionImpl(...args));
}

export async function kitchenReadyAction(...args) {
  return withData(() => kitchenReadyActionImpl(...args));
}

export async function kitchenReleaseAction(...args) {
  return withData(() => kitchenReleaseActionImpl(...args));
}

export async function setDishSoldOutAction(...args) {
  return withData(() => setDishSoldOutActionImpl(...args));
}

export async function toggleSoldOutAction(...args) {
  return withData(() => toggleSoldOutActionImpl(...args));
}

export async function claimAndStartDeliveryAction(...args) {
  return withData(() => claimAndStartDeliveryActionImpl(...args));
}

export async function startDeliveryJourneyAction(...args) {
  return withData(() => startDeliveryJourneyActionImpl(...args));
}

export async function releaseDeliveryAction(...args) {
  return withData(() => releaseDeliveryActionImpl(...args));
}

export async function completeDeliveryAction(...args) {
  return withData(() => completeDeliveryActionImpl(...args));
}

export async function addDishAction(...args) {
  return withData(() => addDishActionImpl(...args));
}

export async function editDishAction(...args) {
  return withData(() => editDishActionImpl(...args));
}

export async function removeDishAction(...args) {
  return withData(() => removeDishActionImpl(...args));
}

export async function restoreDishAction(...args) {
  return withData(() => restoreDishActionImpl(...args));
}

export async function addDailyExpenseAction(...args) {
  return withData(() => addDailyExpenseActionImpl(...args));
}

export async function adminEditOrderAction(...args) {
  return withData(() => adminEditOrderActionImpl(...args));
}

export async function createStaffAction(...args) {
  return withData(() => createStaffActionImpl(...args));
}

export async function resetStaffPasswordAction(...args) {
  return withData(() => resetStaffPasswordActionImpl(...args));
}

export async function resetStaffPinAction(...args) {
  return withData(() => resetStaffPinActionImpl(...args));
}

export async function removeStaffAction(...args) {
  return withData(() => removeStaffActionImpl(...args));
}
