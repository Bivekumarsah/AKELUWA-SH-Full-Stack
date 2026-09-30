"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { apiFetch, readableError } from "@/app/lib/api";

export default function VerifyEmailPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"ready" | "checking" | "verified">("ready");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const token = new URLSearchParams(window.location.search).get("token") || "";
      if (!token) return;
      setState("checking");
      apiFetch("/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) })
        .then(() => setState("verified"))
        .catch((requestError) => { setError(readableError(requestError)); setState("ready"); });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function resend(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const response = await apiFetch<{ message: string }>("/auth/resend-verification", { method: "POST", body: JSON.stringify({ email }) });
      setNotice(response.message);
    } catch (requestError) {
      setError(readableError(requestError));
    }
  }

  return <main className="portal-shell"><section className="auth-card">
    <Link className="auth-brand" href="/" aria-label="Return to AKELUWA SH"><Image src="/company-logo.png" alt="" width={48} height={48} priority unoptimized /><span>SH</span></Link>
    <p className="portal-kicker">EMAIL OWNERSHIP / VERIFY</p>
    <h1>{state === "verified" ? <>Email<br /><em>verified.</em></> : <>Confirm<br /><em>ownership.</em></>}</h1>
    {state === "checking" && <p className="portal-intro" role="status">Validating your secure link...</p>}
    {state === "verified" ? <><p className="portal-intro">Your account is active and your secure session has started.</p><Link className="portal-primary" href="/account">Open account</Link></> : state !== "checking" && <>
      <p className="portal-intro">Enter your account email to receive a new verification link.</p>
      <form className="portal-form" onSubmit={resend}><label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>{error && <p className="form-alert is-error" role="alert">{error}</p>}{notice && <p className="form-alert is-success" role="status">{notice}</p>}<button className="portal-primary" type="submit">Send verification link</button></form>
      <p className="auth-switch"><Link href="/login">Return to sign in</Link></p>
    </>}
  </section></main>;
}
