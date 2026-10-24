"use client";

import { useState } from "react";
import { saveOrderingSettingsAction } from "@/app/actions";

// Admin: pause new orders, or set opening hours. Nothing set = always open.
export function OrderingControls({ initial, status }) {
  const [settings, setSettings] = useState(initial);
  const [current, setCurrent] = useState(status);
  const [useHours, setUseHours] = useState(Boolean(initial.hours));
  const [open, setOpen] = useState(initial.hours?.open || "09:00");
  const [close, setClose] = useState(initial.hours?.close || "22:00");
  const [message, setMessage] = useState(initial.pauseMessage || "");
  const [state, setState] = useState({ pending: false, error: "", saved: "" });

  async function save(changes, savedText) {
    setState({ pending: true, error: "", saved: "" });
    const result = await saveOrderingSettingsAction(changes);
    if (result?.ok) {
      setSettings(result.settings);
      setCurrent(result.status);
      setState({ pending: false, error: "", saved: savedText });
    } else {
      setState({ pending: false, error: result?.error || "Could not save.", saved: "" });
    }
  }

  return (
    <section className={`card-panel ordering-controls ${current.open ? "" : "is-closed"}`}>
      <div className="ordering-controls__head">
        <div>
          <h2>Taking orders</h2>
          <p className="ordering-controls__status" role="status">
            <span className={`status-dot ${current.open ? "status-dot--open" : "status-dot--closed"}`} aria-hidden="true" />
            {current.open ? "Open: customers can order now." : current.message}
          </p>
        </div>
        <button
          type="button"
          className={settings.paused ? "btn-primary" : "btn-secondary"}
          disabled={state.pending}
          onClick={() =>
            save(
              { paused: !settings.paused, pauseMessage: message },
              settings.paused ? "Orders are back on." : "New orders are paused."
            )
          }
        >
          {settings.paused ? "Resume orders" : "Pause new orders"}
        </button>
      </div>

      <details className="ordering-controls__more">
        <summary>Opening hours and pause message</summary>
        <div className="field">
          <label htmlFor="pause-message">Message shown to customers while paused (optional)</label>
          <input
            id="pause-message"
            maxLength={160}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="We're very busy right now. Please check back in 30 minutes."
          />
        </div>
        <label className="ordering-controls__check">
          <input type="checkbox" checked={useHours} onChange={(event) => setUseHours(event.target.checked)} />
          Only take orders during opening hours
        </label>
        {useHours && (
          <div className="form-grid">
            <div className="field">
              <label htmlFor="hours-open">Opens (Addis Ababa time)</label>
              <input id="hours-open" type="time" value={open} onChange={(event) => setOpen(event.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="hours-close">Closes</label>
              <input id="hours-close" type="time" value={close} onChange={(event) => setClose(event.target.value)} />
            </div>
          </div>
        )}
        <button
          type="button"
          className="btn-primary"
          disabled={state.pending}
          onClick={() => save({ pauseMessage: message, hours: useHours ? { open, close } : null }, "Settings saved.")}
        >
          Save
        </button>
      </details>

      {state.error && <p className="field-error" role="alert">{state.error}</p>}
      {state.saved && <p className="field-success" role="status">{state.saved}</p>}
    </section>
  );
}
