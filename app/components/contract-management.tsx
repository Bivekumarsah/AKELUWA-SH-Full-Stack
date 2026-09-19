"use client";

import { FormEvent, useMemo, useState } from "react";
import ContractDocument from "@/app/components/contract-document";
import SignaturePad from "@/app/components/signature-pad";
import { AdminPermission, apiFetch, Contract, readableError, User } from "@/app/lib/api";

const defaultTerms = {
  scope: "Describe the included product features, platforms, integrations, environments, and boundaries of the engagement.",
  deliverables: "List each deliverable, its format, and the acceptance criteria that determine completion.",
  milestones: "Define milestone names, target dates, dependencies, review periods, and who approves each stage.",
  payment_terms: "State deposit, milestone payments, final payment, invoice due dates, taxes, and approved payment methods.",
  revision_terms: "State the included revision rounds. Work outside the agreed scope requires a written change request with revised cost and schedule.",
  support_terms: "Define warranty period, support hours, response targets, maintenance scope, and fees after handover.",
  ownership_terms: "Upon full payment, the client receives ownership of the agreed custom deliverables. Pre-existing tools, libraries, and third-party materials remain subject to their existing licenses.",
  confidentiality_terms: "Both parties will protect non-public business, technical, customer, and access information and use it only to perform this agreement.",
  termination_terms: "Either party may terminate for material breach after written notice and a reasonable cure period. The client pays for accepted work completed through termination.",
  dispute_terms: "The parties will first attempt good-faith negotiation. Governing law, venue, and any mediation or arbitration process should be confirmed with qualified legal counsel.",
  special_terms: "",
};

const can = (user: User | null, permission: AdminPermission) => user?.role === "admin" || Boolean(user?.admin_permissions.includes(permission));

function newContract(users: User[]): Contract {
  const client = users.find((user) => user.role === "user");
  const now = new Date();
  const end = new Date(now); end.setDate(end.getDate() + 30);
  const date = (value: Date) => value.toISOString().slice(0, 10);
  return { id: "", user_id: client?.id || "", contract_number: `AK-${now.getFullYear()}-${String(now.getTime()).slice(-6)}`, title: "Software development agreement", client_name: client?.name || "", client_email: client?.email || "", client_company: "", provider_name: "AKELUWA SH", currency: "USD", amount_cents: 0, start_date: date(now), end_date: date(end), ...defaultTerms, status: "draft", version: 1, content_hash: "", provider_signer_name: "", client_signer_name: "", created_at: "", updated_at: "" };
}

export default function ContractManagement({ initialContracts, users, adminName, administrator, onContractsChange }: { initialContracts: Contract[]; users: User[]; adminName: string; administrator: User | null; onContractsChange: (contracts: Contract[]) => void }) {
  const [contracts, setContracts] = useState(initialContracts);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [viewing, setViewing] = useState<Contract | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [signature, setSignature] = useState("");
  const [signerName, setSignerName] = useState(adminName);
  const canCreate = can(administrator, "contracts.create");
  const canUpdate = can(administrator, "contracts.update");
  const filtered = useMemo(() => contracts.filter((item) => [item.contract_number, item.title, item.client_name, item.client_company, item.status].some((value) => value?.toLowerCase().includes(query.toLowerCase()))), [contracts, query]);

  function update(item: Contract) {
    const next = contracts.some((entry) => entry.id === item.id) ? contracts.map((entry) => entry.id === item.id ? item : entry) : [item, ...contracts];
    setContracts(next);
    onContractsChange(next);
    setViewing(item);
  }

  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      if (!editing) return;
      if (!can(administrator, editing.id ? "contracts.update" : "contracts.create")) { setError(`${editing.id ? "Edit" : "Create"} permission is not assigned.`); return; }
      const { id: _id, status: _status, version: _version, content_hash: _hash, provider_signer_name: _providerName, provider_signature: _providerSignature, provider_signed_at: _providerSignedAt, client_signer_name: _clientName, client_signature: _clientSignature, client_signed_at: _clientSignedAt, sent_at: _sentAt, created_at: _createdAt, updated_at: _updatedAt, ...payload } = editing;
      void [_id, _status, _version, _hash, _providerName, _providerSignature, _providerSignedAt, _clientName, _clientSignature, _clientSignedAt, _sentAt, _createdAt, _updatedAt];
      const response = await apiFetch<{ contract: Contract }>(editing.id ? `/admin/contracts/${editing.id}` : "/admin/contracts", { method: editing.id ? "PUT" : "POST", body: JSON.stringify(payload) });
      update(response.contract); setEditing(null); setNotice("Draft contract saved.");
    } catch (requestError) { setError(readableError(requestError)); } finally { setSaving(false); }
  }

  async function send(item: Contract) {
    if (!can(administrator, "contracts.update")) { setError("Edit permission is not assigned."); return; }
    if (!window.confirm("Send and lock this contract? Commercial terms cannot be edited after this step.")) return;
    try { const response = await apiFetch<{ contract: Contract }>(`/admin/contracts/${item.id}/send`, { method: "POST", body: "{}" }); update(response.contract); setNotice("Contract locked and available to the client."); } catch (requestError) { setError(readableError(requestError)); }
  }

  async function sign(item: Contract) {
    if (!can(administrator, "contracts.update")) { setError("Edit permission is not assigned."); return; }
    if (!signature || signerName.trim().length < 2) { setError("Enter the authorized signer name and draw a signature."); return; }
    try { const response = await apiFetch<{ contract: Contract }>(`/admin/contracts/${item.id}/sign`, { method: "POST", body: JSON.stringify({ signer_name: signerName, signature }) }); update(response.contract); setSignature(""); setNotice("Provider acceptance recorded."); } catch (requestError) { setError(readableError(requestError)); }
  }

  async function finish(item: Contract, status: "completed" | "cancelled") {
    if (!can(administrator, "contracts.update")) { setError("Edit permission is not assigned."); return; }
    if (!window.confirm(`Mark this contract as ${status}?`)) return;
    try { const response = await apiFetch<{ contract: Contract }>(`/admin/contracts/${item.id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }); update(response.contract); } catch (requestError) { setError(readableError(requestError)); }
  }

  if (editing) return <ContractEditor value={editing} users={users} saving={saving} onChange={setEditing} onSubmit={save} onCancel={() => setEditing(null)} />;
  if (viewing) return <section className="admin-panel"><div className="contract-view-actions"><button type="button" onClick={() => setViewing(null)}>Back to contracts</button><button type="button" onClick={() => window.print()}>Print / Save PDF</button>{viewing.status === "draft" && <><button type="button" onClick={() => setEditing(viewing)}>Edit draft</button><button className="portal-primary" type="button" onClick={() => send(viewing)}>Send and lock</button></>}{viewing.status === "pending" && !viewing.provider_signed_at && <button className="portal-primary" type="button" onClick={() => sign(viewing)}>Record provider signature</button>}{viewing.status === "active" && <button type="button" onClick={() => finish(viewing, "completed")}>Mark completed</button>}{!["draft", "completed", "cancelled"].includes(viewing.status) && <button className="danger-action" type="button" onClick={() => finish(viewing, "cancelled")}>Cancel contract</button>}</div>{error && <p className="form-alert is-error">{error}</p>}<ContractDocument contract={viewing} />{viewing.status === "pending" && !viewing.provider_signed_at && <section className="contract-sign-panel"><h3>Provider acceptance</h3><p>Only an authorized AKELUWA SH representative should sign here.</p><label>Authorized signer<input value={signerName} onChange={(event) => setSignerName(event.target.value)} /></label><SignaturePad onChange={setSignature} /></section>}</section>;
  return <section className="admin-panel"><div className="admin-panel-heading"><p className="portal-kicker">AGREEMENTS / CONTROLLED</p><h1>Contracts</h1><p>Prepare clear project terms, lock an exact version, and collect acceptance from both parties.</p></div>{error && <p className="form-alert is-error">{error}</p>}{notice && <p className="form-alert is-success">{notice}</p>}<div className="contract-toolbar"><input type="search" placeholder="Search contracts or clients" value={query} onChange={(event) => setQuery(event.target.value)} /><button className="portal-primary" type="button" onClick={() => setEditing(newContract(users))}>Create contract</button></div><div className="contract-list">{filtered.map((item) => <button type="button" key={item.id} onClick={() => setViewing(item)}><span>{item.contract_number}</span><div><strong>{item.title}</strong><small>{item.client_name} · {item.currency} {(item.amount_cents / 100).toLocaleString()}</small></div><b className={`contract-status status-${item.status}`}>{item.status}</b><i>View</i></button>)}{!filtered.length && <p className="dashboard-state">No contracts match this search.</p>}</div></section>;
}

function ContractEditor({ value, users, saving, onChange, onSubmit, onCancel }: { value: Contract; users: User[]; saving: boolean; onChange: (value: Contract) => void; onSubmit: (event: FormEvent) => void; onCancel: () => void }) {
  const set = (field: keyof Contract, next: string | number) => onChange({ ...value, [field]: next });
  const chooseClient = (id: string) => { const user = users.find((item) => item.id === id); onChange({ ...value, user_id: id, client_name: user?.name || "", client_email: user?.email || "" }); };
  const clauses: Array<[keyof Contract, string]> = [["scope", "Scope of work"], ["deliverables", "Deliverables and acceptance criteria"], ["milestones", "Milestones and schedule"], ["payment_terms", "Payment terms"], ["revision_terms", "Revisions and change requests"], ["support_terms", "Support and maintenance"], ["ownership_terms", "Intellectual property and ownership"], ["confidentiality_terms", "Confidentiality"], ["termination_terms", "Termination"], ["dispute_terms", "Governing law and disputes"], ["special_terms", "Additional terms (optional)"]];
  return <section className="admin-panel"><div className="admin-panel-heading"><p className="portal-kicker">CONTRACT / DRAFT</p><h1>{value.id ? "Edit contract" : "New contract"}</h1><p>Complete every material term before sending. Sent contracts are locked to protect both parties.</p></div><form className="contract-editor" onSubmit={onSubmit}><fieldset><legend>Parties and reference</legend><div className="editor-grid"><label>Assigned client<select value={value.user_id} onChange={(event) => chooseClient(event.target.value)} required><option value="">Select registered client</option>{users.filter((user) => user.role === "user").map((user) => <option key={user.id} value={user.id}>{user.name} · {user.email}</option>)}</select></label><label>Contract number<input value={value.contract_number} onChange={(event) => set("contract_number", event.target.value)} required /></label><label className="wide-field">Project title<input value={value.title} onChange={(event) => set("title", event.target.value)} required /></label><label>Client name<input value={value.client_name} onChange={(event) => set("client_name", event.target.value)} required /></label><label>Client email<input type="email" value={value.client_email} onChange={(event) => set("client_email", event.target.value)} required /></label><label>Client company<input value={value.client_company || ""} onChange={(event) => set("client_company", event.target.value)} /></label><label>Provider<input value={value.provider_name} onChange={(event) => set("provider_name", event.target.value)} required /></label></div></fieldset><fieldset><legend>Time and commercial terms</legend><div className="editor-grid"><label>Start date<input type="date" value={value.start_date} onChange={(event) => set("start_date", event.target.value)} required /></label><label>End date<input type="date" value={value.end_date} min={value.start_date} onChange={(event) => set("end_date", event.target.value)} required /></label><label>Currency<input value={value.currency} maxLength={3} onChange={(event) => set("currency", event.target.value.toUpperCase())} required /></label><label>Total amount<input type="number" min="0" step="0.01" value={value.amount_cents / 100} onChange={(event) => set("amount_cents", Math.round(Number(event.target.value) * 100))} required /></label></div></fieldset><fieldset><legend>Project protections</legend><div className="contract-clause-fields">{clauses.map(([field, label]) => <label key={field}>{label}<textarea value={String(value[field] || "")} onChange={(event) => set(field, event.target.value)} required={field !== "special_terms"} /></label>)}</div></fieldset><p className="contract-legal-note">Template notice: confirm governing law, taxes, liability, privacy, intellectual property, and dispute terms with qualified legal counsel before using this agreement.</p><div className="editor-actions"><button className="portal-primary" type="submit" disabled={saving}>{saving ? "Saving..." : "Save draft"}</button><button type="button" onClick={onCancel}>Cancel</button></div></form></section>;
}
