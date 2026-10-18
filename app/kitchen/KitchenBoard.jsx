"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { kitchenClaimAction, kitchenReadyAction, kitchenReleaseAction, setDishSoldOutAction } from "@/app/actions";
import { Avatar, Modal, Toast } from "@/components/Modal";
import { PushToggle } from "@/components/PushToggle";
import { useNow, minutesAgo } from "@/hooks/useNow";

const MODE_KEY = "addis-kitchen-mode";

// Kitchen board.
// - "My device" mode: a cook on their own phone claims tickets for themself.
// - "Shared tablet" mode: one tablet stays signed in; each cook taps their
//   name and enters their PIN when claiming, so every ticket is credited to
//   the right person without anyone signing out and back in.
export function KitchenBoard({ initialSnapshot, viewer }) {
  const isAdmin = viewer.role === "admin";
  const { data, mutate } = useSWR("/api/kitchen", fetcher, {
    fallbackData: initialSnapshot,
    refreshInterval: 4000,
    revalidateOnFocus: true,
    keepPreviousData: true,
  });
  const snapshot = data || initialSnapshot;
  const now = useNow(20000);

  const [mode, setMode] = useState(isAdmin ? "station" : "personal");
  const [selected, setSelected] = useState(() => new Set());
  const [busyIds, setBusyIds] = useState(() => new Set());
  const [claimTarget, setClaimTarget] = useState(null); // array of ids awaiting cook + PIN
  const [toast, setToast] = useState(null);
  const [showAvailability, setShowAvailability] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(MODE_KEY);
      if (saved === "station" || (saved === "personal" && !isAdmin)) setMode(saved);
    } catch {}
  }, [isAdmin]);

  function changeMode(next) {
    setMode(next);
    setSelected(new Set());
    try {
      window.localStorage.setItem(MODE_KEY, next);
    } catch {}
  }

  // Keep a shared tablet's screen awake while the board is open.
  useEffect(() => {
    if (mode !== "station" || !("wakeLock" in navigator)) return undefined;
    let lock = null;
    const request = () => navigator.wakeLock.request("screen").then((l) => (lock = l)).catch(() => {});
    request();
    const onVisible = () => document.visibilityState === "visible" && request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release?.().catch(() => {});
    };
  }, [mode]);

  const waiting = snapshot.queue.filter((t) => t.status === "placed");
  const cooking = snapshot.queue.filter((t) => t.status === "preparing");
  const ready = snapshot.queue.filter((t) => t.status === "served").reverse();

  // Drop selections for tickets someone else already took.
  const waitingIds = waiting.map((t) => t.id).join(",");
  useEffect(() => {
    const open = new Set(waitingIds.split(","));
    setSelected((previous) => {
      const next = new Set([...previous].filter((id) => open.has(id)));
      return next.size === previous.size ? previous : next;
    });
  }, [waitingIds]);

  const setBusy = (ids, on) =>
    setBusyIds((previous) => {
      const next = new Set(previous);
      ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
      return next;
    });

  // Applies a change to the cached board immediately; the server's snapshot
  // replaces it as soon as the action returns.
  const patchTickets = useCallback(
    (ids, patch) =>
      mutate(
        // The cache can still be empty before the first refresh; start from what's on screen.
        (current = snapshot) => ({
          ...current,
          queue: current.queue.map((t) => (ids.includes(t.id) ? { ...t, ...patch } : t)),
        }),
        { revalidate: false }
      ),
    [mutate, snapshot]
  );

  function toggleSelect(id) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function startClaim(ids) {
    if (ids.length === 0) return;
    if (mode === "station") {
      setClaimTarget(ids);
    } else {
      submitClaim(ids, null, null);
    }
  }

  async function submitClaim(ids, staffId, pin) {
    const cookName = staffId ? snapshot.cooks.find((c) => c.id === staffId)?.name : viewer.name;
    setBusy(ids, true);
    if (!staffId) patchTickets(ids, { status: "preparing", kitchenStaffId: viewer.id, kitchenStaffName: cookName, cookingStartedAt: new Date().toISOString() });
    try {
      const result = await kitchenClaimAction({ orderIds: ids, staffId, pin });
      if (!result?.ok) {
        if (!staffId) mutate();
        return result;
      }
      mutate(result.snapshot, { revalidate: false });
      setSelected(new Set());
      setClaimTarget(null);
      const won = result.results.filter((r) => r.ok).map((r) => `#${r.id}`);
      const lost = result.results.filter((r) => !r.ok);
      setToast({
        tone: lost.length ? "warning" : "success",
        message: [
          won.length ? `${result.cook.name} is cooking ${won.join(", ")}.` : "",
          ...lost.map((r) => `#${r.id}: ${r.error}`),
        ].filter(Boolean).join(" "),
      });
      return result;
    } catch {
      mutate();
      return { ok: false, error: "Network problem. Please try again." };
    } finally {
      setBusy(ids, false);
    }
  }

  async function markReady(ids) {
    setBusy(ids, true);
    patchTickets(ids, { status: "served", kitchenServedAt: new Date().toISOString() });
    try {
      const result = await kitchenReadyAction(ids);
      if (result?.ok) {
        mutate(result.snapshot, { revalidate: false });
        setToast({ tone: "success", message: `Order ${ids.map((id) => `#${id}`).join(", ")} is ready for couriers.` });
      } else {
        mutate();
        setToast({ tone: "error", message: result?.error || "Could not mark the order ready." });
      }
    } catch {
      mutate();
    } finally {
      setBusy(ids, false);
    }
  }

  async function release(id) {
    if (!confirm(`Put order #${id} back in the waiting queue?`)) return;
    setBusy([id], true);
    patchTickets([id], { status: "placed", kitchenStaffId: null, kitchenStaffName: null, cookingStartedAt: null });
    try {
      const result = await kitchenReleaseAction(id);
      mutate(result?.snapshot, { revalidate: !result?.snapshot });
      if (!result?.ok) setToast({ tone: "error", message: result?.error || "Could not release the ticket." });
    } finally {
      setBusy([id], false);
    }
  }

  async function toggleDish(dish) {
    const next = !dish.isSoldOut;
    mutate(
      (current = snapshot) => ({ ...current, dishes: current.dishes.map((d) => (d.id === dish.id ? { ...d, isSoldOut: next } : d)) }),
      { revalidate: false }
    );
    const result = await setDishSoldOutAction(dish.id, next);
    if (!result?.ok) {
      setToast({ tone: "error", message: result?.error || "Could not update availability." });
      mutate();
    }
  }

  const canClaimPersonally = viewer.role === "staff";
  const leaderboard = [...snapshot.cooks].sort((a, b) => b.today.done - a.today.done || a.name.localeCompare(b.name));
  const soldOutCount = snapshot.dishes.filter((d) => d.isSoldOut).length;

  return (
    <div className="board">
      <PushToggle purpose="Get a notification for every new order, even when this page is in the background." />

      <div className="board__toolbar">
        <div className="segmented" role="group" aria-label="Board mode">
          {!isAdmin && (
            <button type="button" className={mode === "personal" ? "is-active" : ""} onClick={() => changeMode("personal")}>
              My device
            </button>
          )}
          <button type="button" className={mode === "station" ? "is-active" : ""} onClick={() => changeMode("station")}>
            Shared kitchen tablet
          </button>
        </div>
        <button type="button" className="btn-secondary" onClick={() => setShowAvailability(true)}>
          Menu availability{soldOutCount ? ` (${soldOutCount} sold out)` : ""}
        </button>
      </div>

      {mode === "station" && (
        <p className="board__hint">
          Shared tablet: tap tickets to select them, press <strong>Claim</strong>, then tap your name and enter your PIN.
          Each claim is credited to the cook who enters the PIN, so nobody needs to sign out.
          {snapshot.cooks.length === 0 && " No kitchen staff have been registered yet. An admin can add them under Staff."}
        </p>
      )}
      {mode === "personal" && !canClaimPersonally && (
        <p className="board__hint">Switch to shared tablet mode to claim tickets on behalf of a cook.</p>
      )}

      <div className="board__layout">
        <div className="board-columns">
          {/* Waiting */}
          <section className="board-column" aria-labelledby="col-waiting">
            <header className="board-column__header">
              <h2 id="col-waiting">Waiting <span className="count">{waiting.length}</span></h2>
              {selected.size > 0 && (
                <button type="button" className="btn-primary" onClick={() => startClaim([...selected])}>
                  Claim {selected.size} selected
                </button>
              )}
            </header>
            {waiting.length === 0 && <p className="board-empty">No new orders. New tickets appear here automatically.</p>}
            {waiting.map((ticket) => {
              const isSelected = selected.has(ticket.id);
              const busy = busyIds.has(ticket.id);
              return (
                <article
                  key={ticket.id}
                  className={`ticket ticket--waiting ${isSelected ? "ticket--selected" : ""}`}
                  onClick={() => (mode === "station" || canClaimPersonally) && toggleSelect(ticket.id)}
                >
                  <TicketHeader ticket={ticket} now={now} label={isSelected ? "Selected" : "New"} />
                  <TicketItems items={ticket.items} />
                  {(mode === "station" || canClaimPersonally) && (
                    <div className="ticket__actions">
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={busy}
                        onClick={(event) => {
                          event.stopPropagation();
                          startClaim([ticket.id]);
                        }}
                      >
                        {busy ? "Claiming…" : "Claim & start cooking"}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </section>

          {/* Cooking */}
          <section className="board-column" aria-labelledby="col-cooking">
            <header className="board-column__header">
              <h2 id="col-cooking">Cooking <span className="count">{cooking.length}</span></h2>
            </header>
            {cooking.length === 0 && <p className="board-empty">Nothing on the stove.</p>}
            {cooking.map((ticket) => {
              const busy = busyIds.has(ticket.id);
              const mine = ticket.kitchenStaffId === viewer.id;
              const canAct = mode === "station" || mine || isAdmin;
              return (
                <article key={ticket.id} className={`ticket ticket--cooking ${mine ? "ticket--mine" : ""}`}>
                  <TicketHeader ticket={ticket} now={now} label="Cooking" />
                  <div className="ticket__claimer">
                    <Avatar name={ticket.kitchenStaffName} photo={snapshot.cooks.find((c) => c.id === ticket.kitchenStaffId)?.photo} size={26} />
                    <span>
                      Claimed by <strong>{mine ? "you" : ticket.kitchenStaffName || "a cook"}</strong>
                      {ticket.cookingStartedAt && <span suppressHydrationWarning> · {minutesAgo(ticket.cookingStartedAt, now)}</span>}
                    </span>
                  </div>
                  <TicketItems items={ticket.items} />
                  {canAct && (
                    <div className="ticket__actions">
                      <button type="button" className="btn-success" disabled={busy} onClick={() => markReady([ticket.id])}>
                        {busy ? "Saving…" : "Ready for pickup"}
                      </button>
                      <button type="button" className="btn-ghost" disabled={busy} onClick={() => release(ticket.id)}>
                        Release
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </section>

          {/* Ready */}
          <section className="board-column" aria-labelledby="col-ready">
            <header className="board-column__header">
              <h2 id="col-ready">Ready <span className="count">{ready.length}</span></h2>
            </header>
            {ready.length === 0 && <p className="board-empty">Finished orders from the last 2 hours show here.</p>}
            {ready.map((ticket) => (
              <article key={ticket.id} className="ticket ticket--ready">
                <TicketHeader ticket={ticket} now={now} label="Ready" />
                <p className="ticket__meta">
                  Cooked by <strong>{ticket.kitchenStaffName || "kitchen"}</strong>
                  {ticket.kitchenServedAt && <span suppressHydrationWarning> · {minutesAgo(ticket.kitchenServedAt, now)}</span>}
                </p>
                <p className="ticket__meta">{ticket.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</p>
              </article>
            ))}
          </section>
        </div>

        <aside className="board-side" aria-label="Today's cooks">
          <h2>Today&apos;s cooks</h2>
          {leaderboard.length === 0 && <p className="board-empty">No kitchen staff registered yet.</p>}
          <ul className="leaderboard">
            {leaderboard.map((cook) => (
              <li key={cook.id} className={cook.id === viewer.id ? "is-me" : ""}>
                <Avatar name={cook.name} photo={cook.photo} size={34} />
                <div className="leaderboard__who">
                  <strong>{cook.name}</strong>
                  <span>
                    {cook.today.items} dishes
                    {cook.today.avgCookMinutes ? ` · avg ${cook.today.avgCookMinutes} min` : ""}
                    {cook.today.cooking ? ` · ${cook.today.cooking} cooking now` : ""}
                  </span>
                </div>
                <span className="leaderboard__count" title="Orders finished today">{cook.today.done}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {claimTarget && (
        <ClaimDialog
          ids={claimTarget}
          cooks={snapshot.cooks}
          onCancel={() => setClaimTarget(null)}
          onSubmit={(staffId, pin) => submitClaim(claimTarget, staffId, pin)}
        />
      )}

      {showAvailability && (
        <Modal title="Menu availability" onClose={() => setShowAvailability(false)} width={560}>
          <p className="board__hint" style={{ marginTop: 0 }}>Sold-out dishes disappear from customer carts immediately.</p>
          <ul className="availability-list">
            {snapshot.dishes.map((dish) => (
              <li key={dish.id}>
                <span>
                  <strong>{dish.name}</strong> <small>{dish.category}</small>
                </span>
                <button
                  type="button"
                  className={dish.isSoldOut ? "btn-success" : "btn-danger"}
                  onClick={() => toggleDish(dish)}
                >
                  {dish.isSoldOut ? "Mark available" : "Mark sold out"}
                </button>
              </li>
            ))}
          </ul>
        </Modal>
      )}

      <Toast message={toast?.message} tone={toast?.tone} onDone={() => setToast(null)} />
    </div>
  );
}

function TicketHeader({ ticket, now, label }) {
  const ageMinutes = Math.round((now - new Date(ticket.createdAt).getTime()) / 60000);
  return (
    <div className="ticket__header">
      <strong className="ticket__id">#{ticket.id}</strong>
      <span className={`ticket__age ${ticket.status === "placed" && ageMinutes >= 10 ? "is-late" : ""}`} suppressHydrationWarning>
        {minutesAgo(ticket.createdAt, now)}
      </span>
      <span className="ticket__label">{label}</span>
    </div>
  );
}

function TicketItems({ items }) {
  return (
    <ul className="ticket__items">
      {items.map((item, index) => (
        <li key={`${item.id}-${index}`}>
          <span className="ticket__qty">{item.qty}×</span>
          <span>{item.name}</span>
        </li>
      ))}
    </ul>
  );
}

// Step 1: tap your name. Step 2: enter your PIN.
function ClaimDialog({ ids, cooks, onCancel, onSubmit }) {
  const [cookId, setCookId] = useState(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const cook = useMemo(() => cooks.find((c) => c.id === cookId), [cooks, cookId]);

  async function submit(value = pin) {
    if (value.length < 4 || submitting) return;
    setSubmitting(true);
    setError("");
    const result = await onSubmit(cookId, value);
    setSubmitting(false);
    if (!result?.ok) {
      setError(result?.error || "Could not claim.");
      setPin("");
    }
  }

  function press(digit) {
    if (pin.length >= 6) return;
    setPin(pin + digit);
    setError("");
  }

  const title = `Claim ${ids.length === 1 ? `order #${ids[0]}` : `${ids.length} orders`}`;

  return (
    <Modal title={title} onClose={onCancel} width={520}>
      {!cook ? (
        <>
          <p className="board__hint" style={{ marginTop: 0 }}>Who is cooking?</p>
          <div className="cook-grid">
            {cooks.map((c) => (
              <button
                key={c.id}
                type="button"
                className="cook-tile"
                disabled={!c.hasPin}
                onClick={() => setCookId(c.id)}
                title={c.hasPin ? "" : "Ask an admin to set a PIN for this cook"}
              >
                <Avatar name={c.name} photo={c.photo} size={52} />
                <span>{c.name}</span>
                {!c.hasPin && <small>No PIN set</small>}
              </button>
            ))}
          </div>
          {cooks.length === 0 && <p className="field-error">No kitchen staff are registered yet.</p>}
        </>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="pin-who">
            <Avatar name={cook.name} photo={cook.photo} size={44} />
            <div>
              <strong>{cook.name}</strong>
              <button type="button" className="link-button" onClick={() => { setCookId(null); setPin(""); setError(""); }}>
                Not you?
              </button>
            </div>
          </div>
          <label htmlFor="kitchen-pin" className="pin-label">Enter your PIN</label>
          <input
            id="kitchen-pin"
            className="pin-input"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            maxLength={6}
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
          />
          <div className="pin-pad">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
              <button key={digit} type="button" onClick={() => press(digit)}>
                {digit}
              </button>
            ))}
            <button type="button" onClick={() => setPin(pin.slice(0, -1))} aria-label="Delete">⌫</button>
            <button type="button" onClick={() => press("0")}>0</button>
            <button type="submit" className="pin-pad__go" disabled={pin.length < 4 || submitting}>
              {submitting ? "…" : "OK"}
            </button>
          </div>
          {error && <p className="field-error" role="alert">{error}</p>}
        </form>
      )}
    </Modal>
  );
}
