"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { BadgeCheck, CircleAlert, LoaderCircle, Search } from "lucide-react";
import { APIError, apiFetch, ContractVerification, readableError, RecordVerification } from "@/app/lib/api";

type VerificationDisplay = {
  code: string;
  recordType: string;
  title: string;
  holderName?: string;
  issuedOn?: string;
  expiresOn?: string;
  status: string;
  providerName: string;
  publicNote?: string;
  fingerprint?: string;
  version?: number;
  providerSignedAt?: string;
  clientSignedAt?: string;
};

function displayDate(value?: string) {
  if (!value) return "Not applicable";
  return new Date(value.includes("T") ? value : `${value}T00:00:00`).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    ...(value.includes("T") ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

function contractDisplay(item: ContractVerification): VerificationDisplay {
  return {
    code: item.contract_number,
    recordType: "contract",
    title: item.title,
    issuedOn: item.issued_at,
    status: item.status,
    providerName: item.provider_name,
    fingerprint: item.content_hash,
    version: item.version,
    providerSignedAt: item.provider_signed_at,
    clientSignedAt: item.client_signed_at,
  };
}

function recordDisplay(item: RecordVerification): VerificationDisplay {
  return {
    code: item.verification_code,
    recordType: item.record_type,
    title: item.title,
    holderName: item.holder_name,
    issuedOn: item.issued_on,
    expiresOn: item.expires_on,
    status: item.status,
    providerName: item.provider_name,
    publicNote: item.public_note,
  };
}

export default function ContractVerificationTool() {
  const [code, setCode] = useState("");
  const [fingerprint, setFingerprint] = useState("");
  const [result, setResult] = useState<VerificationDisplay | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const verify = useCallback(async (rawCode: string, rawFingerprint = "") => {
    const normalizedCode = rawCode.trim().toUpperCase();
    const normalizedFingerprint = rawFingerprint.trim().toLowerCase();
    setChecking(true);
    setError("");
    setResult(null);
    try {
      if (normalizedFingerprint) {
        const response = await apiFetch<{ verification: ContractVerification }>(`/contracts/verify?number=${encodeURIComponent(normalizedCode)}&fingerprint=${encodeURIComponent(normalizedFingerprint)}`, { cache: "no-store" });
        setResult(contractDisplay(response.verification));
      } else {
        const response = await apiFetch<{ verification: RecordVerification }>(`/records/verify?code=${encodeURIComponent(normalizedCode)}`, { cache: "no-store" });
        setResult(recordDisplay(response.verification));
      }
      const url = new URL(window.location.href);
      url.search = "";
      if (normalizedFingerprint) {
        url.searchParams.set("number", normalizedCode);
        url.searchParams.set("fingerprint", normalizedFingerprint);
      } else {
        url.searchParams.set("code", normalizedCode);
      }
      window.history.replaceState(null, "", url);
    } catch (requestError) {
      setError(requestError instanceof APIError && requestError.status === 404
        ? "This ID is not registered in AKELUWA SH records. Confirm every character or contact the company directly."
        : readableError(requestError));
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    const initialLookup = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const initialCode = params.get("code") || params.get("number") || "";
      const initialFingerprint = params.get("fingerprint") || "";
      if (!initialCode && !initialFingerprint) return;
      setCode(initialCode.toUpperCase());
      setFingerprint(initialFingerprint.toLowerCase());
      if (initialCode) void verify(initialCode, initialFingerprint);
    }, 0);
    return () => window.clearTimeout(initialLookup);
  }, [verify]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void verify(code, fingerprint);
  }

  const verified = result && result.status !== "revoked" && result.status !== "expired" && result.status !== "cancelled";
  return <section className="inner-section contract-verification-tool" aria-labelledby="verification-tool-title">
    <form onSubmit={submit}>
      <div className="verification-form-heading">
        <p className="section-label">AUTHENTICITY LOOKUP</p>
        <h2 id="verification-tool-title">Check the company record.</h2>
      </div>
      <label htmlFor="verification-code">Document, certificate, or contract ID
        <input id="verification-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="AK-CERT-2026-0001" required minLength={3} maxLength={80} autoComplete="off" spellCheck={false} />
      </label>
      <label htmlFor="contract-fingerprint">SHA-256 fingerprint <small>Optional: use for exact contract-copy matching</small>
        <input id="contract-fingerprint" value={fingerprint} onChange={(event) => setFingerprint(event.target.value.toLowerCase())} placeholder="64-character fingerprint" minLength={64} maxLength={64} pattern="[a-fA-F0-9]{64}" autoComplete="off" spellCheck={false} />
      </label>
      <button className="portal-primary" type="submit" disabled={checking}>
        {checking ? <LoaderCircle className="verification-spinner" size={18} aria-hidden="true" /> : <Search size={18} aria-hidden="true" />}
        {checking ? "Checking record..." : "Verify record"}
      </button>
    </form>

    <div className="verification-result" aria-live="polite" aria-busy={checking}>
      {!checking && !result && !error && <div className="verification-awaiting"><Search size={22} aria-hidden="true" /><p>Enter the ID printed on the document or certificate.</p></div>}
      {error && <div className="verification-failure" role="alert"><CircleAlert size={24} aria-hidden="true" /><div><strong>Not an AKELUWA SH verified record</strong><p>{error}</p><a href="mailto:akeluwasoftwarehub@gmail.com">Contact akeluwasoftwarehub@gmail.com</a></div></div>}
      {result && <div className={`verification-success${verified ? "" : " is-invalid"}`}>
        <header>{verified ? <BadgeCheck size={30} aria-hidden="true" /> : <CircleAlert size={30} aria-hidden="true" />}<div><span>{verified ? "VERIFIED AKELUWA SH RECORD" : "RECORD NOT VALID"}</span><h2>{result.code}</h2></div></header>
        <p>{result.title}</p>
        <dl>
          <div><dt>Record type</dt><dd>{result.recordType}</dd></div>
          <div><dt>Status</dt><dd className={`status-${result.status}`}>{result.status}</dd></div>
          <div><dt>Issued by</dt><dd>{result.providerName}</dd></div>
          <div><dt>Issued</dt><dd>{displayDate(result.issuedOn)}</dd></div>
          {result.holderName && <div><dt>Issued to</dt><dd>{result.holderName}</dd></div>}
          {result.expiresOn && <div><dt>Expires</dt><dd>{displayDate(result.expiresOn)}</dd></div>}
          {result.version !== undefined && <div><dt>Version</dt><dd>{result.version}</dd></div>}
          {result.providerSignedAt && <div><dt>Provider signature</dt><dd>{displayDate(result.providerSignedAt)}</dd></div>}
          {result.clientSignedAt && <div><dt>Client signature</dt><dd>{displayDate(result.clientSignedAt)}</dd></div>}
        </dl>
        {result.publicNote && <p className="verification-public-note">{result.publicNote}</p>}
        {result.fingerprint && <div><span>Matched fingerprint</span><code>{result.fingerprint}</code></div>}
      </div>}
    </div>
  </section>;
}
