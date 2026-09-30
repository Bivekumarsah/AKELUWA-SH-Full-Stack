"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import { apiFetch, readableError, User } from "@/app/lib/api";
import { useGuestOnly } from "@/app/lib/use-session";

type LoginResponse = {
  user?: User;
  mfa_required?: boolean;
  enrollment_required?: boolean;
  challenge_token?: string;
  secret?: string;
  otpauth_uri?: string;
  recovery_codes?: string[];
};

export default function LoginPage() {
  const checkingSession = useGuestOnly();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [challengeToken, setChallengeToken] = useState("");
  const [enrollmentRequired, setEnrollmentRequired] = useState(false);
  const [setupSecret, setSetupSecret] = useState("");
  const [otpauthURI, setOtpauthURI] = useState("");
  const [qrError, setQRError] = useState("");
  const [copied, setCopied] = useState(false);
  const [code, setCode] = useState("");
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [recoveryCodesCopied, setRecoveryCodesCopied] = useState(false);
  const [recoveryCodesSaved, setRecoveryCodesSaved] = useState(false);
  const qrCanvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!otpauthURI || !qrCanvas.current) return;
    let active = true;
    setQRError("");
    QRCode.toCanvas(qrCanvas.current, otpauthURI, {
      width: 240,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#08090b", light: "#ffffff" },
    }).catch(() => {
      if (active) setQRError("The QR code could not be generated. Use the setup key instead.");
    });
    return () => {
      active = false;
    };
  }, [otpauthURI]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (result.mfa_required && result.challenge_token) {
        setChallengeToken(result.challenge_token);
        setEnrollmentRequired(Boolean(result.enrollment_required));
        setSetupSecret(result.secret || "");
        setOtpauthURI(result.otpauth_uri || "");
        return;
      }
      if (result.user) {
        window.location.replace(result.user.role === "admin" || result.user.role === "sub_admin" ? "/admin" : "/account");
      }
    } catch (requestError) {
      setError(readableError(requestError));
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await apiFetch<LoginResponse>("/auth/mfa/verify", {
        method: "POST",
        body: JSON.stringify({ challenge_token: challengeToken, code }),
      });
      if (result.recovery_codes?.length) {
        setRecoveryCodes(result.recovery_codes);
        setCode("");
        return;
      }
      window.location.replace("/admin");
    } catch (requestError) {
      setError(readableError(requestError));
    } finally {
      setLoading(false);
    }
  }

  function restartLogin() {
    setChallengeToken("");
    setEnrollmentRequired(false);
    setSetupSecret("");
    setOtpauthURI("");
    setQRError("");
    setCopied(false);
    setCode("");
    setRecoveryMode(false);
    setRecoveryCodes([]);
    setRecoveryCodesCopied(false);
    setRecoveryCodesSaved(false);
    setPassword("");
    setError("");
  }

  async function copySetupKey() {
    try {
      await navigator.clipboard.writeText(setupSecret);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setQRError("Copy was unavailable. Select the setup key manually.");
    }
  }

  async function copyRecoveryCodes() {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join("\n"));
      setRecoveryCodesCopied(true);
      window.setTimeout(() => setRecoveryCodesCopied(false), 2000);
    } catch {
      setError("Copy was unavailable. Store each recovery code manually.");
    }
  }

  if (checkingSession) {
    return <main className="portal-shell"><p className="auth-session-state" role="status">Checking your secure session...</p></main>;
  }

  return (
    <main className="portal-shell">
      <section className={`auth-card${enrollmentRequired || recoveryCodes.length ? " has-mfa-enrollment" : ""}`}>
        <Link className="auth-brand" href="/" aria-label="Return to AKELUWA SH">
          <Image src="/company-logo.png" alt="" width={48} height={48} priority unoptimized />
          <span>SH</span>
        </Link>
        <p className="portal-kicker">SECURE ACCOUNT ACCESS / {recoveryCodes.length ? "003" : challengeToken ? "002" : "001"}</p>
        <h1>{recoveryCodes.length ? <>Save<br /><em>recovery.</em></> : challengeToken ? <>Verify<br /><em>access.</em></> : <>Welcome<br /><em>back.</em></>}</h1>
        {recoveryCodes.length ? <>
          <p className="portal-intro">Store these single-use codes in a secure password manager. They will not be shown again.</p>
          <div className="recovery-code-panel" aria-label="MFA recovery codes">
            {recoveryCodes.map((recoveryCode) => <code key={recoveryCode}>{recoveryCode}</code>)}
          </div>
          <button className="recovery-copy" type="button" onClick={copyRecoveryCodes}>{recoveryCodesCopied ? "Copied" : "Copy all codes"}</button>
          <label className="recovery-confirm"><input type="checkbox" checked={recoveryCodesSaved} onChange={(event) => setRecoveryCodesSaved(event.target.checked)} />I stored these codes securely</label>
          {error && <p className="form-alert is-error" role="alert">{error}</p>}
          <button className="portal-primary" type="button" disabled={!recoveryCodesSaved} onClick={() => window.location.replace("/admin")}>Continue to administration</button>
        </> : !challengeToken ? <>
          <p className="portal-intro">Customers, administrators, and authorized staff use this secure sign-in. Your account access is assigned automatically after verification.</p>
          <form className="portal-form" onSubmit={submit}>
            <label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
            <label>Password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
            {error && <p className="form-alert is-error" role="alert">{error}</p>}
            <button className="portal-primary" type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign in securely"}</button>
          </form>
          <p className="auth-switch"><Link href="/forgot-password">Forgot password?</Link></p>
          <p className="auth-switch">New to AKELUWA? <Link href="/register">Create an account</Link></p>
        </> : <>
          <p className="portal-intro">{enrollmentRequired ? "Add the setup key to your authenticator app, then enter its six-digit code." : recoveryMode ? "Enter one unused recovery code." : "Enter the six-digit code from your authenticator app."}</p>
          {enrollmentRequired && <div className="mfa-enrollment">
            <div className="mfa-qr-panel">
              <canvas ref={qrCanvas} width={240} height={240} role="img" aria-label="Authenticator enrollment QR code" />
              <span>Scan with your authenticator app</span>
            </div>
            <div className="mfa-setup-key"><span>Manual setup key</span><strong>{setupSecret}</strong><button type="button" onClick={copySetupKey}>{copied ? "Copied" : "Copy key"}</button><small>Keep this key private. It is shown only during enrollment.</small></div>
          </div>}
          {qrError && <p className="form-alert is-error" role="alert">{qrError}</p>}
          <form className="portal-form" onSubmit={verifyCode}>
            <label>{recoveryMode ? "Recovery code" : "Authenticator code"}<input className="mfa-code-input" inputMode={recoveryMode ? "text" : "numeric"} autoComplete={recoveryMode ? "off" : "one-time-code"} pattern={recoveryMode ? "[A-HJ-NP-Z2-9-]{16,19}" : "[0-9]{6}"} maxLength={recoveryMode ? 19 : 6} value={code} onChange={(event) => setCode(recoveryMode ? event.target.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9-]/g, "").slice(0, 19) : event.target.value.replace(/\D/g, "").slice(0, 6))} required autoFocus /></label>
            {error && <p className="form-alert is-error" role="alert">{error}</p>}
            <button className="portal-primary" type="submit" disabled={loading || (recoveryMode ? code.replaceAll("-", "").length !== 16 : code.length !== 6)}>{loading ? "Verifying..." : enrollmentRequired ? "Enable MFA and continue" : "Verify and continue"}</button>
          </form>
          {!enrollmentRequired && <button className="auth-back" type="button" onClick={() => { setRecoveryMode((current) => !current); setCode(""); setError(""); }}>{recoveryMode ? "Use authenticator code" : "Use a recovery code"}</button>}
          <button className="auth-back" type="button" onClick={restartLogin}>Back to sign in</button>
        </>}
      </section>
    </main>
  );
}
