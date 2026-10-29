"use client";

import { useEffect, useState } from "react";
import { clearOptOut, disablePush, enablePush } from "@/lib/push-client";

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () => window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone;

/**
 * Lets someone turn on phone/desktop notifications for this device.
 * `purpose` is the short explanation shown next to the button.
 */
export function PushToggle({ purpose = "Get a notification when your order status changes." }) {
  const [state, setState] = useState("checking"); // checking | unsupported | ios-install | denied | off | on | busy
  const [error, setError] = useState("");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setState(isIos() && !isStandalone() ? "ios-install" : "unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setState(subscription ? "on" : "off"))
      .catch(() => setState("off"));
  }, []);

  async function turnOn() {
    setError("");
    setState("busy");
    try {
      clearOptOut();
      setState(await enablePush());
    } catch (err) {
      setError(err.message || "Could not turn on notifications.");
      setState("off");
    }
  }

  async function turnOff() {
    setState("busy");
    try {
      await disablePush();
    } finally {
      setState("off");
    }
  }

  if (state === "checking") return null;

  return (
    <div className="push-toggle">
      <div className="push-toggle__text">
        <strong>{state === "on" ? "Notifications are on" : "Notifications"}</strong>
        <span>
          {state === "unsupported"
            ? "This browser doesn't support notifications."
            : state === "ios-install"
            ? "On iPhone: tap Share → Add to Home Screen, open Addis Eats from there, then turn notifications on."
            : state === "denied"
            ? "Notifications are blocked. Allow them in your browser's site settings, then reload."
            : purpose}
        </span>
        {error && <span className="field-error">{error}</span>}
      </div>
      {(state === "off" || state === "busy") && (
        <button type="button" className="btn-primary" onClick={turnOn} disabled={state === "busy"}>
          {state === "busy" ? "Turning on…" : "Turn on"}
        </button>
      )}
      {state === "on" && (
        <button type="button" className="btn-ghost" onClick={turnOff}>
          Turn off
        </button>
      )}
    </div>
  );
}
