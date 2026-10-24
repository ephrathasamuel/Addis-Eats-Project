"use client";

import { useState } from "react";
import Link from "next/link";
import { resolveOrderProblemAction } from "@/app/actions";

const formatWhen = (iso) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Addis_Ababa",
  });

// Admin: problems customers reported on delivered orders.
export function ProblemReports({ initial }) {
  const [reports, setReports] = useState(initial);
  const [busy, setBusy] = useState("");
  const open = reports.filter((report) => report.problem.status === "open");
  // Opened on load when something needs attention; after that the admin decides.
  const [startOpen] = useState(open.length > 0);

  if (reports.length === 0) return null;

  async function resolve(id) {
    setBusy(id);
    const result = await resolveOrderProblemAction(id);
    setBusy("");
    if (result?.ok) {
      setReports((list) =>
        list.map((report) =>
          report.id === id ? { ...report, problem: { ...report.problem, status: "resolved" } } : report
        )
      );
    }
  }

  return (
    <details className="card-panel problem-reports" open={startOpen}>
      <summary>
        <strong>Customer problems</strong>{" "}
        <span className={`count ${open.length ? "count--alert" : ""}`}>{open.length} open</span>
      </summary>
      <ul className="problem-reports__list">
        {reports.map((report) => (
          <li key={report.id} className={report.problem.status === "open" ? "is-open" : ""}>
            <div className="problem-reports__main">
              <strong>
                <Link href={`/orders/${report.id}`}>#{report.id}</Link> · {report.problem.label}
              </strong>
              {report.problem.note && <span>&quot;{report.problem.note}&quot;</span>}
              <span className="text-muted">
                {report.name}
                {report.phone && (
                  <>
                    {" · "}
                    <a href={`tel:${report.phone}`}>{report.phone}</a>
                  </>
                )}
                {" · "}reported {formatWhen(report.problem.at)}
                {report.kitchenStaffName ? ` · cooked by ${report.kitchenStaffName}` : ""}
                {report.courierName ? ` · delivered by ${report.courierName}` : ""}
              </span>
            </div>
            {report.problem.status === "open" ? (
              <button type="button" className="btn-secondary" disabled={busy === report.id} onClick={() => resolve(report.id)}>
                {busy === report.id ? "Saving…" : "Mark resolved"}
              </button>
            ) : (
              <span className="problem-reports__done">Resolved</span>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
