"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch, CompanyAccount, readableError, User } from "@/app/lib/api";

const emptyAccount: CompanyAccount = {
  display_name: "",
  legal_name: "",
  tagline: "",
  tagline_meaning: "",
  primary_email: "",
  support_email: "",
  careers_email: "",
  phone: "",
  website_url: "",
  registration_number: "",
  tax_id: "",
  address_line: "",
  city: "",
  region: "",
  postal_code: "",
  country: "",
  timezone: "Asia/Kathmandu",
  currency: "NPR",
  linkedin_url: "",
  github_url: "",
  created_at: "",
  updated_at: "",
};

type Props = {
  administrator: User | null;
};

export default function CompanyAccountPanel({ administrator }: Props) {
  const [account, setAccount] = useState<CompanyAccount>(emptyAccount);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const canUpdate = administrator?.role === "admin" || Boolean(administrator?.admin_permissions.includes("accounts.update"));

  useEffect(() => {
    let active = true;
    apiFetch<{ company_account: CompanyAccount }>("/admin/company-account")
      .then((response) => {
        if (active) setAccount(response.company_account);
      })
      .catch((requestError) => {
        if (active) setError(readableError(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function set(field: keyof CompanyAccount, value: string) {
    setAccount((current) => ({ ...current, [field]: value }));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!canUpdate) {
      setError("Edit permission is not assigned.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const payload = {
        display_name: account.display_name,
        legal_name: account.legal_name,
        tagline: account.tagline,
        tagline_meaning: account.tagline_meaning,
        primary_email: account.primary_email,
        support_email: account.support_email,
        careers_email: account.careers_email,
        phone: account.phone,
        website_url: account.website_url,
        registration_number: account.registration_number,
        tax_id: account.tax_id,
        address_line: account.address_line,
        city: account.city,
        region: account.region,
        postal_code: account.postal_code,
        country: account.country,
        timezone: account.timezone,
        currency: account.currency,
        linkedin_url: account.linkedin_url,
        github_url: account.github_url,
      };
      const response = await apiFetch<{ company_account: CompanyAccount }>("/admin/company-account", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setAccount(response.company_account);
      setNotice("Company account updated.");
    } catch (requestError) {
      setError(readableError(requestError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-panel company-account">
      <div className="admin-panel-heading">
        <p className="portal-kicker">ORGANIZATION / ACCOUNT</p>
        <h1>Company account</h1>
        <p>Maintain the organization record used for business identity, communication, and operational defaults.</p>
      </div>

      <div className="company-account-status" aria-label="Company account status">
        <article><span>ACCOUNT</span><strong>{loading ? "Loading" : "Active"}</strong></article>
        <article><span>ACCESS</span><strong>{administrator?.role === "admin" ? "Administrator" : "Unavailable"}</strong></article>
        <article><span>MFA</span><strong>{administrator?.mfa_enabled ? "Enabled" : "Required"}</strong></article>
        <article><span>UPDATED</span><strong>{account.updated_at ? new Date(account.updated_at).toLocaleDateString() : "Pending"}</strong></article>
      </div>

      {error && <p className="form-alert is-error" role="alert">{error}</p>}
      {notice && <p className="form-alert is-success" role="status">{notice}</p>}

      {loading ? <p className="dashboard-state">Loading company account...</p> : (
        <form className="company-account-form content-editor" onSubmit={save}>
          <fieldset>
            <legend>Organization identity</legend>
            <div className="editor-grid">
              <label>Display name<input value={account.display_name} onChange={(event) => set("display_name", event.target.value)} minLength={2} maxLength={120} required /></label>
              <label>Legal name<input value={account.legal_name} onChange={(event) => set("legal_name", event.target.value)} minLength={2} maxLength={180} required /></label>
              <label className="wide-field">Company tagline<textarea value={account.tagline} onChange={(event) => set("tagline", event.target.value)} maxLength={300} /></label>
              <label className="wide-field">Tagline meaning<textarea value={account.tagline_meaning} onChange={(event) => set("tagline_meaning", event.target.value)} maxLength={500} /></label>
            </div>
          </fieldset>

          <fieldset>
            <legend>Communication</legend>
            <div className="editor-grid">
              <label>Primary email<input type="email" value={account.primary_email} onChange={(event) => set("primary_email", event.target.value)} required /></label>
              <label>Phone<input type="tel" value={account.phone} onChange={(event) => set("phone", event.target.value)} maxLength={60} /></label>
              <label>Support email<input type="email" value={account.support_email} onChange={(event) => set("support_email", event.target.value)} /></label>
              <label>Careers email<input type="email" value={account.careers_email} onChange={(event) => set("careers_email", event.target.value)} /></label>
              <label className="wide-field">Website URL<input type="url" value={account.website_url} onChange={(event) => set("website_url", event.target.value)} placeholder="https://" /></label>
            </div>
          </fieldset>

          <fieldset>
            <legend>Legal and location</legend>
            <div className="editor-grid">
              <label>Registration number<input value={account.registration_number} onChange={(event) => set("registration_number", event.target.value)} maxLength={120} /></label>
              <label>Tax or VAT ID<input value={account.tax_id} onChange={(event) => set("tax_id", event.target.value)} maxLength={120} /></label>
              <label className="wide-field">Street address<input value={account.address_line} onChange={(event) => set("address_line", event.target.value)} maxLength={240} /></label>
              <label>City<input value={account.city} onChange={(event) => set("city", event.target.value)} maxLength={100} /></label>
              <label>State or province<input value={account.region} onChange={(event) => set("region", event.target.value)} maxLength={100} /></label>
              <label>Postal code<input value={account.postal_code} onChange={(event) => set("postal_code", event.target.value)} maxLength={30} /></label>
              <label>Country<input value={account.country} onChange={(event) => set("country", event.target.value)} minLength={2} maxLength={100} required /></label>
            </div>
          </fieldset>

          <fieldset>
            <legend>Regional and online presence</legend>
            <div className="editor-grid">
              <label>Timezone<select value={account.timezone} onChange={(event) => set("timezone", event.target.value)} required><option value="Asia/Kathmandu">Asia/Kathmandu</option><option value="Asia/Kolkata">Asia/Kolkata</option><option value="Asia/Dubai">Asia/Dubai</option><option value="Europe/London">Europe/London</option><option value="America/New_York">America/New York</option><option value="UTC">UTC</option></select></label>
              <label>Default currency<select value={account.currency} onChange={(event) => set("currency", event.target.value)} required><option value="NPR">NPR</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option><option value="INR">INR</option><option value="AED">AED</option></select></label>
              <label>LinkedIn URL<input type="url" value={account.linkedin_url} onChange={(event) => set("linkedin_url", event.target.value)} placeholder="https://linkedin.com/company/..." /></label>
              <label>GitHub URL<input type="url" value={account.github_url} onChange={(event) => set("github_url", event.target.value)} placeholder="https://github.com/..." /></label>
            </div>
          </fieldset>

          <section className="company-admin-identity" aria-labelledby="administrator-identity-title">
            <div><span>AUTHORIZED ADMINISTRATOR</span><h2 id="administrator-identity-title">{administrator?.name || "Administrator"}</h2></div>
            <dl><div><dt>Email</dt><dd>{administrator?.email || "Unavailable"}</dd></div><div><dt>Role</dt><dd>{administrator?.role || "Unavailable"}</dd></div><div><dt>Multi-factor authentication</dt><dd>{administrator?.mfa_enabled ? "Enabled" : "Enrollment required"}</dd></div></dl>
          </section>

          <div className="editor-actions"><button className="portal-primary" type="submit" disabled={saving || !canUpdate}>{saving ? "Saving..." : canUpdate ? "Save company account" : "View only"}</button></div>
        </form>
      )}
    </section>
  );
}
