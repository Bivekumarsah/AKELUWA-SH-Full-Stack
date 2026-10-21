"use client";

import { FormEvent, useEffect, useState } from "react";
import { AuthBrand } from "@/app/components/auth-brand";
import Link from "next/link";
import { apiFetch, readableError } from "@/app/lib/api";

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setToken(new URLSearchParams(window.location.search).get("token") || ""), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true);
    setError("");
    try {
      await apiFetch("/auth/password-reset/confirm", { method: "POST", body: JSON.stringify({ token, password }) });
      setComplete(true);
    } catch (requestError) {
      setError(readableError(requestError));
    } finally {
      setLoading(false);
    }
  }

  return <main className="portal-shell"><section className="auth-card">
    <AuthBrand />
    <p className="portal-kicker">Account recovery</p><h1>{complete ? "Password updated." : "Set a new password."}</h1>
    {complete ? <><p className="portal-intro">Your previous sessions have been revoked.</p><Link className="portal-primary" href="/login">Sign in</Link></> : <form className="portal-form" onSubmit={submit}>
      <label>New password<input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={12} maxLength={72} required /></label>
      <label>Confirm password<input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={12} maxLength={72} required /></label>
      <small className="field-note">Use 12 to 72 characters.</small>{error && <p className="form-alert is-error" role="alert">{error}</p>}
      <button className="portal-primary" type="submit" disabled={loading || !token}>{loading ? "Updating..." : "Update password"}</button>
    </form>}
  </section></main>;
}
