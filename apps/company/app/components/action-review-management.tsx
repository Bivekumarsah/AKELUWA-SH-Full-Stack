"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminActionRequest, apiFetch, readableError } from "@/app/lib/api";

const actionLabels: Record<string, string> = {
  "service.delete": "Delete service",
  "portfolio.delete": "Delete portfolio item",
  "download.delete": "Delete download",
  "career.delete": "Delete career opening",
  "career_application.delete": "Delete candidate application",
  "invoice.void": "Void invoice",
  "transaction.void": "Void ledger entry",
};

export default function ActionReviewManagement() {
  const [items, setItems] = useState<AdminActionRequest[]>([]);
  const [filter, setFilter] = useState<"pending" | "history">("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const response = await apiFetch<{ action_requests: AdminActionRequest[] }>("/admin/action-requests");
    setItems(response.action_requests);
  }, []);

  useEffect(() => {
    let active = true;
    apiFetch<{ action_requests: AdminActionRequest[] }>("/admin/action-requests")
      .then((response) => { if (active) setItems(response.action_requests); })
      .catch((requestError) => { if (active) setError(readableError(requestError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const visible = useMemo(() => items.filter((item) => filter === "pending" ? item.status === "pending" : item.status !== "pending"), [filter, items]);
  const pendingCount = items.filter((item) => item.status === "pending").length;

  async function review(item: AdminActionRequest, decision: "approve" | "reject") {
    const prompt = decision === "approve" ? `Approve ${actionLabels[item.action] || item.action} for ${item.target_label}?` : `Reject this request from ${item.requester_name}?`;
    if (!window.confirm(prompt)) return;
    setBusy(item.id); setError(""); setNotice("");
    try {
      const response = await apiFetch<{ action_request: AdminActionRequest }>(`/admin/action-requests/${item.id}/${decision}`, {
        method: "POST",
        body: JSON.stringify({ note: notes[item.id] || "" }),
      });
      setItems((current) => current.map((entry) => entry.id === item.id ? response.action_request : entry));
      setNotice(decision === "approve" ? "The approved action was completed." : "The request was rejected without changing the record.");
    } catch (requestError) {
      setError(readableError(requestError));
      await load().catch(() => undefined);
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="admin-panel action-review-management">
      <div className="admin-panel-heading">
        <p className="portal-kicker">APPROVALS / DESTRUCTIVE ACTIONS</p>
        <h1>Reviews</h1>
        <p>Approve or reject deletion and void requests submitted by delegated administrators.</p>
      </div>
      {error && <p className="form-alert is-error" role="alert">{error}</p>}
      {notice && <p className="form-alert is-success" role="status">{notice}</p>}
      <div className="review-toolbar" role="tablist" aria-label="Review request status">
        <button type="button" role="tab" aria-selected={filter === "pending"} className={filter === "pending" ? "is-active" : ""} onClick={() => setFilter("pending")}>Pending <span>{pendingCount}</span></button>
        <button type="button" role="tab" aria-selected={filter === "history"} className={filter === "history" ? "is-active" : ""} onClick={() => setFilter("history")}>History <span>{items.length - pendingCount}</span></button>
      </div>
      {loading ? <p className="dashboard-state">Loading review requests...</p> : (
        <div className="action-review-list">
          {visible.map((item) => (
            <article key={item.id}>
              <header>
                <div><span>{actionLabels[item.action] || item.action}</span><strong>{item.target_label}</strong><small>Requested by {item.requester_name} on {new Date(item.created_at).toLocaleString()}</small></div>
                <b className={`review-status status-${item.status}`}>{item.status}</b>
              </header>
              {item.status === "pending" ? <>
                <label>Review note <small>optional</small><textarea value={notes[item.id] || ""} maxLength={500} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} /></label>
                <footer><button type="button" onClick={() => review(item, "reject")} disabled={busy === item.id}>Reject</button><button className="portal-primary" type="button" onClick={() => review(item, "approve")} disabled={busy === item.id}>{busy === item.id ? "Working..." : "Approve action"}</button></footer>
              </> : <div className="review-outcome"><span>Reviewed by {item.reviewer_name || "administrator"}{item.reviewed_at ? ` on ${new Date(item.reviewed_at).toLocaleString()}` : ""}</span>{item.review_note && <p>{item.review_note}</p>}{item.failure_message && <p className="review-failure">{item.failure_message}</p>}</div>}
            </article>
          ))}
          {!visible.length && <p className="dashboard-state">{filter === "pending" ? "No actions are waiting for review." : "No reviewed actions yet."}</p>}
        </div>
      )}
    </section>
  );
}
