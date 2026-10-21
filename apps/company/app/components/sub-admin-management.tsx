"use client";

import { FormEvent, useEffect, useState } from "react";
import { AdminPermission, apiFetch, readableError, User } from "@/app/lib/api";

type PermissionAction = "view" | "create" | "update" | "delete";
type PermissionArea = {
  label: string;
  detail: string;
  grants: Partial<Record<PermissionAction, AdminPermission>>;
};

const permissionActions: Array<{ value: PermissionAction; label: string }> = [
  { value: "view", label: "View" },
  { value: "create", label: "Create" },
  { value: "update", label: "Edit" },
  { value: "delete", label: "Delete" },
];

const permissionAreas: PermissionArea[] = [
  { label: "Overview", detail: "Operational totals", grants: { view: "overview.view" } },
  { label: "Inquiries", detail: "Project pipeline", grants: { view: "inquiries.view", update: "inquiries.update" } },
  { label: "Contracts", detail: "Terms and signatures", grants: { view: "contracts.view", create: "contracts.create", update: "contracts.update" } },
  { label: "Services", detail: "Public capabilities", grants: { view: "services.view", create: "services.create", update: "services.update", delete: "services.delete" } },
  { label: "Portfolio", detail: "Public case studies", grants: { view: "portfolio.view", create: "portfolio.create", update: "portfolio.update", delete: "portfolio.delete" } },
  { label: "Downloads", detail: "Public resources", grants: { view: "downloads.view", create: "downloads.create", update: "downloads.update", delete: "downloads.delete" } },
  { label: "Careers", detail: "Openings and candidates", grants: { view: "careers.view", create: "careers.create", update: "careers.update", delete: "careers.delete" } },
  { label: "Accounts", detail: "Invoices and ledger", grants: { view: "accounts.view", create: "accounts.create", update: "accounts.update", delete: "accounts.delete" } },
];

const emptyForm = { name: "", email: "", password: "", permissions: [] as AdminPermission[] };

function togglePermission(values: AdminPermission[], permission: AdminPermission) {
  const [area, action] = permission.split(".");
  if (values.includes(permission)) {
    return action === "view"
      ? values.filter((value) => !value.startsWith(`${area}.`))
      : values.filter((value) => value !== permission);
  }
  const next = [...values, permission];
  const viewPermission = `${area}.view` as AdminPermission;
  return action !== "view" && !next.includes(viewPermission) ? [...next, viewPermission] : next;
}

export default function SubAdminManagement() {
  const [subAdmins, setSubAdmins] = useState<User[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    apiFetch<{ sub_admins: User[] }>("/admin/sub-admins")
      .then((response) => { if (active) setSubAdmins(response.sub_admins); })
      .catch((requestError) => { if (active) setError(readableError(requestError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function createSubAdmin(event: FormEvent) {
    event.preventDefault();
    setSaving("new");
    setError("");
    setNotice("");
    try {
      const response = await apiFetch<{ sub_admin: User }>("/admin/sub-admins", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setSubAdmins((current) => [response.sub_admin, ...current]);
      setForm(emptyForm);
      setNotice("Sub-administrator created. MFA enrollment is required at first sign-in.");
    } catch (requestError) {
      setError(readableError(requestError));
    } finally {
      setSaving("");
    }
  }

  function changeSubAdmin(id: string, change: Partial<Pick<User, "admin_permissions" | "account_active">>) {
    setSubAdmins((current) => current.map((user) => user.id === id ? { ...user, ...change } : user));
  }

  async function saveSubAdmin(user: User) {
    setSaving(user.id);
    setError("");
    setNotice("");
    try {
      const response = await apiFetch<{ sub_admin: User }>(`/admin/sub-admins/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ permissions: user.admin_permissions, account_active: user.account_active }),
      });
      setSubAdmins((current) => current.map((item) => item.id === user.id ? response.sub_admin : item));
      setNotice(`${response.sub_admin.name}'s access was updated.`);
    } catch (requestError) {
      setError(readableError(requestError));
    } finally {
      setSaving("");
    }
  }

  return (
    <section className="admin-panel sub-admin-management">
      <div className="admin-panel-heading">
        <p className="portal-kicker">ACCESS CONTROL / DELEGATED</p>
        <h1>Sub-admins</h1>
        <p>Assign view, create, edit, and delete privileges independently. Destructive actions always require full-admin approval.</p>
      </div>

      {error && <p className="form-alert is-error" role="alert">{error}</p>}
      {notice && <p className="form-alert is-success" role="status">{notice}</p>}

      <form className="sub-admin-create content-editor" onSubmit={createSubAdmin}>
        <fieldset>
          <legend>New sub-administrator</legend>
          <div className="editor-grid">
            <label>Full name<input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} minLength={2} maxLength={120} required /></label>
            <label>Email<input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required /></label>
            <label className="wide-field">Initial password<input type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} minLength={12} maxLength={128} required /></label>
          </div>
          <PermissionGrid values={form.permissions} onChange={(permissions) => setForm((current) => ({ ...current, permissions }))} />
        </fieldset>
        <div className="editor-actions"><button className="portal-primary" type="submit" disabled={saving === "new" || form.permissions.length === 0}>{saving === "new" ? "Creating..." : "Create sub-admin"}</button></div>
      </form>

      <div className="sub-admin-list">
        <div className="panel-heading"><div><span>DELEGATED ACCOUNTS</span><strong>{subAdmins.length}</strong></div></div>
        {loading ? <p className="dashboard-state">Loading delegated access...</p> : subAdmins.length ? subAdmins.map((user) => (
          <article key={user.id}>
            <header>
              <div><strong>{user.name}</strong><span>{user.email}</span></div>
              <div className="sub-admin-state">
                <span className={user.mfa_enabled ? "mfa-ready" : "mfa-pending"}>{user.mfa_enabled ? "MFA enabled" : "MFA pending"}</span>
                <label><input type="checkbox" checked={user.account_active} onChange={(event) => changeSubAdmin(user.id, { account_active: event.target.checked })} />Active</label>
              </div>
            </header>
            <PermissionGrid values={user.admin_permissions} onChange={(admin_permissions) => changeSubAdmin(user.id, { admin_permissions })} />
            <footer><span>Created {new Date(user.created_at).toLocaleDateString()}</span><button type="button" onClick={() => saveSubAdmin(user)} disabled={saving === user.id || user.admin_permissions.length === 0}>{saving === user.id ? "Saving..." : "Save access"}</button></footer>
          </article>
        )) : <p className="dashboard-state">No sub-administrators have been created.</p>}
      </div>
    </section>
  );
}

function PermissionGrid({ values, onChange }: { values: AdminPermission[]; onChange: (values: AdminPermission[]) => void }) {
  return (
    <div className="permission-matrix" role="group" aria-label="Assigned privileges">
      <div className="permission-matrix-head"><span>Work area</span>{permissionActions.map((action) => <span key={action.value}>{action.label}</span>)}</div>
      {permissionAreas.map((area) => (
        <div className="permission-matrix-row" key={area.label}>
          <span><strong>{area.label}</strong><small>{area.detail}</small></span>
          {permissionActions.map((action) => {
            const permission = area.grants[action.value];
            return permission ? (
              <label key={action.value} title={`${action.label} ${area.label}`}>
                <input type="checkbox" aria-label={`${action.label} ${area.label}`} checked={values.includes(permission)} onChange={() => onChange(togglePermission(values, permission))} />
              </label>
            ) : <i aria-hidden="true" key={action.value}>-</i>;
          })}
        </div>
      ))}
    </div>
  );
}
