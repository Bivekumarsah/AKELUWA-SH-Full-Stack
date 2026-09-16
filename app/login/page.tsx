"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { apiFetch, readableError, User } from "@/app/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await apiFetch<{ user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      window.location.assign(result.user.role === "admin" ? "/admin" : "/account");
    } catch (requestError) {
      setError(readableError(requestError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="portal-shell">
      <Link className="portal-brand" href="/" aria-label="Return to AKELUWA SH">
        <Image src="/company-logo.png" alt="" width={48} height={48} priority unoptimized />
        <span><strong>AKELUWA</strong> SH</span>
      </Link>
      <section className="auth-card">
        <p className="portal-kicker">SECURE CLIENT ACCESS / 001</p>
        <h1>Welcome<br /><em>back.</em></h1>
        <p className="portal-intro">Sign in to view your project inquiries or manage the AKELUWA platform.</p>
        <form className="portal-form" onSubmit={submit}>
          <label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>Password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          {error && <p className="form-alert is-error" role="alert">{error}</p>}
          <button className="portal-primary" type="submit" disabled={loading}>{loading ? "Signing in…" : "Sign in securely ↗"}</button>
        </form>
        <p className="auth-switch">New to AKELUWA? <Link href="/register">Create an account</Link></p>
      </section>
    </main>
  );
}
