"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import AccountContracts from "@/app/components/account-contracts";
import ProfileMenu from "@/app/components/profile-menu";
import { apiFetch, Contract, Inquiry, Invoice, readableError, User } from "@/app/lib/api";
import { useProtectedPage } from "@/app/lib/use-session";

export default function AccountPage() {
  useProtectedPage();
  const [user, setUser] = useState<User | null>(null);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const requestID = useRef(0);

  const loadAccount = useCallback(async () => {
    const currentRequest = ++requestID.current;
    setLoading(true);
    setError("");
    const results = await Promise.allSettled([
      apiFetch<{ user: User }>("/auth/me"),
      apiFetch<{ inquiries: Inquiry[] }>("/account/inquiries"),
      apiFetch<{ contracts: Contract[] }>("/account/contracts"),
      apiFetch<{ invoices: Invoice[] }>("/account/invoices"),
    ]);
    if (currentRequest !== requestID.current) return;

    const [profile, inquiryData, contractData, invoiceData] = results;
    if (profile.status === "rejected") {
      if ((profile.reason as { status?: number }).status === 401) {
        window.location.replace("/login");
        return;
      }
      setError(readableError(profile.reason));
      setUnavailable(["profile", "inquiries", "contracts", "invoices"]);
      setLoading(false);
      return;
    }

    setUser(profile.value.user);
    const failed: string[] = [];
    if (inquiryData.status === "fulfilled") setInquiries(inquiryData.value.inquiries); else failed.push("inquiries");
    if (contractData.status === "fulfilled") setContracts(contractData.value.contracts); else failed.push("contracts");
    if (invoiceData.status === "fulfilled") setInvoices(invoiceData.value.invoices); else failed.push("invoices");
    setUnavailable(failed);
    if (failed.length) setError(`Some account information is temporarily unavailable: ${failed.join(", ")}.`);
    setLoading(false);
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadAccount(), 0);
    return () => {
      window.clearTimeout(initialLoad);
      requestID.current += 1;
    };
  }, [loadAccount]);

  return (
    <main className="dashboard-shell">
      <a className="skip-link" href="#account-content">Skip to account content</a>
      <header className="dashboard-header">
        <Link className="portal-brand" href="/"><Image src="/company-logo.png" alt="" width={48} height={48} unoptimized /><span><strong>AKELUWA</strong> SH</span></Link>
        <ProfileMenu user={user} onUserChange={setUser} showAdminLink />
      </header>
      <section className="dashboard-main" id="account-content" tabIndex={-1} aria-busy={loading}>
        <div className="dashboard-title"><p className="portal-kicker">CUSTOMER SPACE / PRIVATE</p><h1>{user ? `Hello, ${user.name.split(" ")[0]}.` : "Your account."}</h1><p>Track the project conversations connected to your account.</p></div>
        {loading && !user && <div className="account-loading" role="status" aria-label="Loading your account"><span /><span /><span /></div>}
        {error && <div className="form-alert is-error account-load-alert" role="alert"><span>{error}</span><button type="button" onClick={() => void loadAccount()} disabled={loading}>{loading ? "Retrying..." : "Retry"}</button></div>}
        {user && <>
          <div className="account-grid">
            <article className="account-profile"><span>PROFILE</span><strong>{user.name}</strong><p>{user.email}</p><Link href="/#contact">Start another project</Link></article>
            <section className="inquiry-history">
              <div className="panel-heading"><div><span>PROJECT INQUIRIES</span><strong>{inquiries.length.toString().padStart(2, "0")}</strong></div></div>
              {unavailable.includes("inquiries") ? <SectionUnavailable label="inquiries" onRetry={loadAccount} /> : inquiries.length === 0 ? <p className="dashboard-state">No inquiries yet. Your first project can start from the contact section.</p> : inquiries.map((item) => (
                <article className="inquiry-card" key={item.id}>
                  <div><span>{new Date(item.created_at).toLocaleDateString()}</span><b className={`status-${item.status}`}>{item.status.replace("_", " ")}</b></div>
                  <h2>{item.company || "Personal project"}</h2>
                  <p>{item.message}</p>
                </article>
              ))}
            </section>
          </div>
          <section className="inquiry-history account-invoice-history">
            <div className="panel-heading"><div><span>INVOICES</span><strong>{invoices.length.toString().padStart(2, "0")}</strong></div></div>
            {unavailable.includes("invoices") ? <SectionUnavailable label="invoices" onRetry={loadAccount} /> : invoices.length === 0 ? <p className="dashboard-state">No invoices have been issued to this account.</p> : invoices.map((invoice) => (
              <article className="inquiry-card" key={invoice.id}>
                <div><span>Due {new Date(`${invoice.due_date}T00:00:00`).toLocaleDateString()}</span><b className={`status-${invoice.status}`}>{invoice.status}</b></div>
                <h2>{invoice.invoice_number}</h2>
                <p>{invoice.items.map((item) => item.description).join(", ")}</p>
                <strong>{invoice.currency} {(invoice.balance_cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} due</strong>
              </article>
            ))}
          </section>
          {unavailable.includes("contracts") ? <section className="account-contracts"><div className="panel-heading"><div><span>PROJECT CONTRACTS</span><strong>--</strong></div></div><SectionUnavailable label="contracts" onRetry={loadAccount} /></section> : <AccountContracts key={contracts.map((item) => `${item.id}:${item.updated_at}`).join("|")} initialContracts={contracts} user={user} />}
        </>}
      </section>
    </main>
  );
}

function SectionUnavailable({ label, onRetry }: { label: string; onRetry: () => Promise<void> }) {
  return <div className="account-section-unavailable" role="status"><p>Could not load {label}.</p><button type="button" onClick={() => void onRetry()}>Try again</button></div>;
}
