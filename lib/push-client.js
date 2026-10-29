// Browser side of notifications (safe to import from client components only).
//
// Browsers never let a site switch notifications on by itself: the phone asks
// "Allow notifications?" once, and only right after a tap. So:
//   - askOnce(): called from a tap (Place order, first tap on a staff board).
//     Asks at most once per device; if the person already allowed it, it just
//     makes sure this device is subscribed, with no question at all.
//   - keepSubscribed(): on every visit, quietly re-subscribes a device that
//     already allowed notifications (no question).

const ASKED_KEY = "addis-push-asked";

function urlBase64ToUint8Array(base64) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** Subscribes this device and tells the server. Assumes permission is granted. */
async function subscribe() {
  const { publicKey } = await fetch("/api/push").then((response) => response.json());
  if (!publicKey) throw new Error("Notifications aren't set up on the server yet.");
  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ||
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }));
  const response = await fetch("/api/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription }),
  });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "Could not turn on notifications.");
  return true;
}

/** Turns notifications on (asks for permission). Returns "on" | "denied" | "off". */
export async function enablePush() {
  if (!pushSupported()) return "off";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";
  await subscribe();
  return "on";
}

export async function disablePush() {
  if (!pushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    await fetch("/api/push", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
    await subscription.unsubscribe();
  }
  try {
    window.localStorage.setItem("addis-push-off", "1");
  } catch {}
}

/** Quietly keeps an already-allowed device subscribed (no question asked). */
export async function keepSubscribed() {
  try {
    if (!pushSupported() || Notification.permission !== "granted") return;
    if (window.localStorage.getItem("addis-push-off") === "1") return;
    await subscribe();
  } catch {}
}

/** From a tap: ask once per device; afterwards only re-subscribe silently. */
export function askOnce() {
  try {
    if (!pushSupported()) return;
    if (window.localStorage.getItem("addis-push-off") === "1") return;
    if (Notification.permission === "granted") {
      keepSubscribed();
      return;
    }
    if (Notification.permission === "denied" || window.localStorage.getItem(ASKED_KEY)) return;
    window.localStorage.setItem(ASKED_KEY, "1");
    enablePush().catch(() => {});
  } catch {}
}

/** Called when the person turns notifications on themselves (profile). */
export function clearOptOut() {
  try {
    window.localStorage.removeItem("addis-push-off");
  } catch {}
}
