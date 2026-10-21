"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { BadgeCheck, Ban, FileCheck2, Pencil, Plus, RefreshCw } from "lucide-react";
import { apiFetch, readableError, User, VerificationRecord } from "@/app/lib/api";

const today = () => new Date().toISOString().slice(0, 10);
function secureVerificationCode(recordType = "certificate") {
  const random = new Uint8Array(6);
  crypto.getRandomValues(random);
  const suffix = Array.from(random, (value) => value.toString(16).padStart(2, "0")).join("").toUpperCase();
  return `AK-${recordType.slice(0, 4).toUpperCase()}-${new Date().getFullYear()}-${suffix}`;
}

const blankRecord = (): VerificationRecord => ({
  id: "", verification_code: secureVerificationCode(), record_type: "certificate", title: "", holder_name: "",
  issued_on: today(), expires_on: "", status: "active", public_note: "", content_hash: "", created_at: "", updated_at: "",
});

function payload(item: VerificationRecord) {
  return {
    verification_code: item.verification_code,
    record_type: item.record_type,
    title: item.title,
    holder_name: item.holder_name || "",
    issued_on: item.issued_on,
    expires_on: item.expires_on || "",
    status: item.status,
    public_note: item.public_note || "",
    content_hash: item.content_hash || "",
  };
}

export default function RecordVerificationManagement({ administrator }: { administrator: User | null }) {
  const [records, setRecords] = useState<VerificationRecord[]>([]);
  const [draft, setDraft] = useState<VerificationRecord | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const canCreate = administrator?.role === "admin" || administrator?.admin_permissions.includes("contracts.create");
  const canUpdate = administrator?.role === "admin" || administrator?.admin_permissions.includes("contracts.update");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch<{ verification_records: VerificationRecord[] }>("/admin/verification-records");
      setRecords(response.verification_records);
    } catch (requestError) {
      setError(readableError(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initialLoad);
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return records.filter((item) => !normalized || [item.verification_code, item.record_type, item.title, item.holder_name, item.status].some((value) => value?.toLowerCase().includes(normalized)));
  }, [query, records]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    setSaving(true);
    setError("");
    try {
      const response = await apiFetch<{ verification_record: VerificationRecord }>(draft.id ? `/admin/verification-records/${draft.id}` : "/admin/verification-records", {
        method: draft.id ? "PUT" : "POST",
        body: JSON.stringify(payload(draft)),
      });
      setRecords((current) => draft.id
        ? current.map((item) => item.id === response.verification_record.id ? response.verification_record : item)
        : [response.verification_record, ...current]);
      setDraft(null);
      setNotice(draft.id ? "Verification record updated." : "Verification record issued.");
    } catch (requestError) {
      setError(readableError(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function revoke(item: VerificationRecord) {
    if (!canUpdate || item.status === "revoked" || !window.confirm(`Revoke verification code ${item.verification_code}?`)) return;
    setError("");
    try {
      const response = await apiFetch<{ verification_record: VerificationRecord }>(`/admin/verification-records/${item.id}`, { method: "PUT", body: JSON.stringify({ ...payload(item), status: "revoked" }) });
      setRecords((current) => current.map((record) => record.id === item.id ? response.verification_record : record));
      setNotice("Verification record revoked. Public checks will show it as invalid.");
    } catch (requestError) {
      setError(readableError(requestError));
    }
  }

  async function fingerprintFile(file?: File) {
    if (!file || !draft) return;
    setError("");
    try {
      const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
      const contentHash = Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
      setDraft((current) => current ? { ...current, content_hash: contentHash } : current);
    } catch {
      setError("This browser could not calculate the file fingerprint.");
    }
  }

  return <section className="admin-panel verification-admin-panel">
    <div className="admin-panel-heading"><p className="portal-kicker">TRUST / PUBLIC REGISTRY</p><h1>Record verification</h1><p>Issue public verification IDs for certificates, documents, letters, reports, and approvals. Contracts are recognized automatically by contract number.</p></div>
    {error && <p className="form-alert is-error" role="alert">{error}</p>}
    {notice && <p className="form-alert is-success" role="status">{notice}</p>}
    <div className="admin-toolbar"><label><input aria-label="Search verification records" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search code, title, holder, or type" /></label>{canCreate && <button type="button" onClick={() => setDraft(blankRecord())}><Plus size={16} aria-hidden="true" />New record</button>}</div>
    <p className="result-count">{loading ? "Loading records..." : `${filtered.length} verification record${filtered.length === 1 ? "" : "s"}`}</p>

    {draft && <form className="publish-editor verification-editor" onSubmit={save}>
      <div className="editor-grid">
        <div className="verification-id-field"><label htmlFor="verification-record-id">Verification ID</label><div className="verification-code-control"><input id="verification-record-id" value={draft.verification_code} onChange={(event) => setDraft({ ...draft, verification_code: event.target.value.toUpperCase() })} placeholder="AK-CERT-2026-0001" required minLength={3} maxLength={80} pattern="[A-Za-z0-9][A-Za-z0-9_/-]*" /><button type="button" aria-label="Create random record code" title="Create random record code" onClick={() => setDraft({ ...draft, verification_code: secureVerificationCode(draft.record_type) })}><RefreshCw size={16} aria-hidden="true" /></button></div></div>
        <label>Record type<select value={draft.record_type} onChange={(event) => setDraft({ ...draft, record_type: event.target.value as VerificationRecord["record_type"] })}><option value="certificate">Certificate</option><option value="document">Document</option><option value="letter">Letter</option><option value="report">Report</option><option value="approval">Approval</option><option value="other">Other</option></select></label>
        <label className="wide-field">Public title<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Certificate of completion" required minLength={3} maxLength={200} /></label>
        <label>Issued to <small>Optional; shown publicly only when entered</small><input value={draft.holder_name || ""} onChange={(event) => setDraft({ ...draft, holder_name: event.target.value })} placeholder="Person or organization" maxLength={160} /></label>
        <label>Status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as VerificationRecord["status"] })}><option value="active">Active</option><option value="revoked">Revoked</option></select></label>
        <label>Issue date<input type="date" value={draft.issued_on} onChange={(event) => setDraft({ ...draft, issued_on: event.target.value })} required /></label>
        <label>Expiry date <small>Optional</small><input type="date" value={draft.expires_on || ""} min={draft.issued_on} onChange={(event) => setDraft({ ...draft, expires_on: event.target.value })} /></label>
        <label className="wide-field">Public note<textarea value={draft.public_note || ""} onChange={(event) => setDraft({ ...draft, public_note: event.target.value })} placeholder="Public confirmation details only; do not include confidential information." maxLength={500} /></label>
        <label className="wide-field">SHA-256 fingerprint <small>Optional exact-file proof</small><input value={draft.content_hash || ""} onChange={(event) => setDraft({ ...draft, content_hash: event.target.value.toLowerCase() })} placeholder="64-character fingerprint" minLength={64} maxLength={64} pattern="[a-fA-F0-9]{64}" /></label>
        <label className="wide-field verification-file-field"><FileCheck2 size={16} aria-hidden="true" /> Calculate from file<input type="file" onChange={(event) => void fingerprintFile(event.target.files?.[0])} /></label>
      </div>
      <div className="verification-editor-actions"><button className="portal-primary" type="submit" disabled={saving}>{saving ? "Saving..." : draft.id ? "Update record" : "Issue record"}</button><button type="button" onClick={() => setDraft(null)}>Cancel</button></div>
    </form>}

    <div className="publish-list verification-record-list">
      {!loading && !filtered.length && <p className="dashboard-state">No registered verification records match this view.</p>}
      {filtered.map((item) => {
        const expired = Boolean(item.expires_on && item.expires_on < today());
        const displayStatus = item.status === "revoked" ? "revoked" : expired ? "expired" : "valid";
        return <article key={item.id}><div><strong>{item.verification_code}</strong><span>{item.title}{item.holder_name ? ` / ${item.holder_name}` : ""}</span></div><b className={`status-${displayStatus}`}>{displayStatus}</b>{canUpdate && <button type="button" onClick={() => setDraft(item)} aria-label={`Edit ${item.verification_code}`} title="Edit record"><Pencil size={16} aria-hidden="true" /></button>}{canUpdate && <button className="danger-action" type="button" onClick={() => void revoke(item)} disabled={item.status === "revoked"} aria-label={`Revoke ${item.verification_code}`} title="Revoke record"><Ban size={16} aria-hidden="true" /></button>}<BadgeCheck className="verification-record-icon" size={18} aria-hidden="true" /></article>;
      })}
    </div>
  </section>;
}
