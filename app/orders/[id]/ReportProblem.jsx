"use client";

import { useState } from "react";
import { reportOrderProblemAction } from "@/app/actions";

// "Something wrong with this order?" on a delivered order. The restaurant sees
// the report in the admin panel and contacts the customer.
export function ReportProblem({ orderId, types, existing }) {
  const [problem, setProblem] = useState(existing || null);
  const [editing, setEditing] = useState(false);
  const [type, setType] = useState(existing?.type || "");
  const [note, setNote] = useState(existing?.note || "");
  const [state, setState] = useState({ pending: false, error: "" });

  async function submit(event) {
    event.preventDefault();
    setState({ pending: true, error: "" });
    const result = await reportOrderProblemAction(orderId, type, note);
    if (result?.ok) {
      setProblem(result.problem);
      setEditing(false);
      setState({ pending: false, error: "" });
    } else {
      setState({ pending: false, error: result?.error || "Could not send your report." });
    }
  }

  if (problem && !editing) {
    return (
      <section className="card-panel problem-report">
        <h3>{problem.status === "resolved" ? "Your report was resolved" : "We got your report"}</h3>
        <p className="text-muted" style={{ margin: 0 }}>
          {types[problem.type] || problem.type}
          {problem.note ? `: "${problem.note}"` : ""}
        </p>
        {problem.status !== "resolved" && (
          <>
            <p style={{ marginBottom: 0 }}>The restaurant will contact you on the phone number from your order.</p>
            <button type="button" className="btn-ghost" style={{ marginTop: "0.75rem" }} onClick={() => setEditing(true)}>
              Change report
            </button>
          </>
        )}
      </section>
    );
  }

  return (
    <details className="card-panel collapsible-panel problem-report" open={editing}>
      <summary>Something wrong with this order?</summary>
      <form onSubmit={submit}>
        <fieldset className="problem-report__types">
          <legend>What went wrong?</legend>
          {Object.entries(types).map(([key, label]) => (
            <label key={key} className={`problem-report__type ${type === key ? "is-selected" : ""}`}>
              <input type="radio" name="problem-type" value={key} checked={type === key} onChange={() => setType(key)} />
              {label}
            </label>
          ))}
        </fieldset>
        <div className="field">
          <label htmlFor="problem-note">Details (optional)</label>
          <textarea
            id="problem-note"
            rows={3}
            maxLength={500}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="For example: the shiro was missing"
          />
        </div>
        {state.error && <p className="field-error" role="alert">{state.error}</p>}
        <button type="submit" className="btn-primary" disabled={!type || state.pending}>
          {state.pending ? "Sending…" : "Send report"}
        </button>
      </form>
    </details>
  );
}
