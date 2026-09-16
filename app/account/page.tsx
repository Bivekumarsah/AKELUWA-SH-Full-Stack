"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { apiFetch, Inquiry, readableError, User } from "@/app/lib/api";

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<{ user: User }>("/auth/me"),
      apiFetch<{ inquiries: Inquiry[] }>("/account/inquiries"),
    ])
      .then(([profile, inquiryData]) => {
        setUser(profile.user);
        setInquiries(inquiryData.inquiries);
      })
      .catch((requestError) => {
        setError(readableError(requestError));
        if ((requestError as { status?: number }).status === 401) {
          window.location.assign("/login");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function logout() {
    await apiFetch("/auth/logout", { method: "POST", body: "{}" }).catch(() => undefined);
    window.location.assign("/");
  }

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <Link className="portal-brand" href="/"><Image src="/company-logo.png" alt="" width={48} height={48} unoptimized /><span><strong>AKELUWA</strong> SH</span></Link>
        <div><span>{user?.email}</span>{user?.role === "admin" && <Link href="/admin">Admin dashboard</Link>}<button type="button" onClick={logout}>Sign out</button></div>
      </header>
      <section className="dashboard-main">
        <div className="dashboard-title"><p className="portal-kicker">CLIENT SPACE / PRIVATE</p><h1>{user ? `Hello, ${user.name.split(" ")[0]}.` : "Your account."}</h1><p>Track the project conversations connected to your account.</p></div>
        {loading && <p className="dashboard-state">Loading your account…</p>}
        {error && <p className="form-alert is-error" role="alert">{error}</p>}
        {!loading && !error && (
          <div className="account-grid">
            <article className="account-profile"><span>PROFILE</span><strong>{user?.name}</strong><p>{user?.email}</p><Link href="/#contact">Start another project ↗</Link></article>
            <section className="inquiry-history">
              <div className="panel-heading"><div><span>PROJECT INQUIRIES</span><strong>{inquiries.length.toString().padStart(2, "0")}</strong></div></div>
              {inquiries.length === 0 ? <p className="dashboard-state">No inquiries yet. Your first project can start from the contact section.</p> : inquiries.map((item) => (
                <article className="inquiry-card" key={item.id}>
                  <div><span>{new Date(item.created_at).toLocaleDateString()}</span><b className={`status-${item.status}`}>{item.status.replace("_", " ")}</b></div>
                  <h2>{item.company || "Personal project"}</h2>
                  <p>{item.message}</p>
                </article>
              ))}
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
