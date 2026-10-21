"use client";

import { FormEvent, useState } from "react";
import { AuthBrand } from "@/app/components/auth-brand";
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
    <AuthBrand />
    <p className="portal-kicker">Account recovery</p><h1>Forgot your password?</h1>
    <p className="portal-intro">Enter your account email to receive a time-limited reset link.</p>
    <form className="portal-form" onSubmit={submit}><label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>{error && <p className="form-alert is-error" role="alert">{error}</p>}{notice && <p className="form-alert is-success" role="status">{notice}</p>}<button className="portal-primary" type="submit" disabled={loading}>{loading ? "Sending..." : "Send reset link"}</button></form>
    <p className="auth-switch"><Link href="/login">Return to sign in</Link></p>
  </section></main>;
}
