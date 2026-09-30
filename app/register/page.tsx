"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { apiFetch, readableError } from "@/app/lib/api";
import { useGuestOnly } from "@/app/lib/use-session";

export default function RegisterPage() {
  const checkingSession = useGuestOnly();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiFetch("/auth/register", { method: "POST", body: JSON.stringify(form) });
      setSubmittedEmail(form.email);
    } catch (requestError) {
      setError(readableError(requestError));
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return <main className="portal-shell"><p className="auth-session-state" role="status">Checking your secure session...</p></main>;
  }

  return <main className="portal-shell"><section className="auth-card">
    <Link className="auth-brand" href="/" aria-label="Return to AKELUWA SH">
      <Image src="/company-logo.png" alt="" width={48} height={48} priority unoptimized /><span>SH</span>
    </Link>
    <p className="portal-kicker">CUSTOMER ACCOUNT / {submittedEmail ? "VERIFY" : "CREATE"}</p>
    <h1>{submittedEmail ? <>Check your<br /><em>inbox.</em></> : <>Start with<br /><em>clarity.</em></>}</h1>
    {submittedEmail ? <>
      <p className="portal-intro">We sent an ownership link to <strong>{submittedEmail}</strong>. Open it to activate your account.</p>
      <p className="auth-switch"><Link href="/verify-email">Resend verification</Link> or <Link href="/login">return to sign in</Link></p>
    </> : <>
      <p className="portal-intro">Create an account to keep project inquiries and progress connected to you.</p>
      <form className="portal-form" onSubmit={submit}>
        <label>Full name<input autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required minLength={2} /></label>
        <label>Email address<input type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
        <label>Password<input type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required minLength={12} maxLength={72} /></label>
        <small className="field-note">Use 12 to 72 characters.</small>
        {error && <p className="form-alert is-error" role="alert">{error}</p>}
        <button className="portal-primary" type="submit" disabled={loading}>{loading ? "Creating account..." : "Create account"}</button>
      </form>
      <p className="auth-switch">Already registered? <Link href="/login">Sign in</Link></p>
    </>}
  </section></main>;
}
