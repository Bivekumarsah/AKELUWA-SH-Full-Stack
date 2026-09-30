"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { apiFetch, readableError } from "@/app/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const response = await apiFetch<{ message: string }>("/auth/password-reset/request", { method: "POST", body: JSON.stringify({ email }) });
      setNotice(response.message);
    } catch (requestError) {
      setError(readableError(requestError));
    } finally {
      setLoading(false);
    }
  }

  return <main className="portal-shell"><section className="auth-card">
    <Link className="auth-brand" href="/" aria-label="Return to AKELUWA SH"><Image src="/company-logo.png" alt="" width={48} height={48} priority unoptimized /><span>SH</span></Link>
    <p className="portal-kicker">ACCOUNT RECOVERY / REQUEST</p><h1>Reset<br /><em>securely.</em></h1>
    <p className="portal-intro">Enter your account email to receive a time-limited reset link.</p>
    <form className="portal-form" onSubmit={submit}><label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>{error && <p className="form-alert is-error" role="alert">{error}</p>}{notice && <p className="form-alert is-success" role="status">{notice}</p>}<button className="portal-primary" type="submit" disabled={loading}>{loading ? "Sending..." : "Send reset link"}</button></form>
    <p className="auth-switch"><Link href="/login">Return to sign in</Link></p>
  </section></main>;
}
