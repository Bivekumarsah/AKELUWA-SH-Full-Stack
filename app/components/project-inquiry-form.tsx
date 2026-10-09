"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, ChevronDown, X } from "lucide-react";
import { apiFetch, readableError } from "@/app/lib/api";

const emptyInquiry = { name: "", email: "", company: "", budget: "", message: "" };
const budgetRanges = ["Not sure yet", "Under $2,500", "$2,500-$10,000", "$10,000-$25,000", "$25,000+"];

type InquiryInterest = { type: "service" | "project"; title: string };

export function ProjectInquiryForm({ initialInterest = null }: { initialInterest?: InquiryInterest | null }) {
  const [inquiry, setInquiry] = useState(emptyInquiry);
  const [interest, setInterest] = useState(initialInterest);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const successHeading = useRef<HTMLHeadingElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{
    type: "idle" | "loading" | "success" | "error";
    message: string;
  }>({ type: "idle", message: "" });

  useEffect(() => {
    if (status.type === "success") successHeading.current?.focus();
    if (status.type === "idle" && submittedEmail) nameInput.current?.focus();
  }, [status.type, submittedEmail]);

  const context = interest ? `${interest.type === "service" ? "Service interest" : "Reference project"}: ${interest.title}\n\n` : "";

  async function submitInquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status.type === "loading") return;
    setStatus({ type: "loading", message: "" });
    try {
      await apiFetch("/inquiries", { method: "POST", body: JSON.stringify({ ...inquiry, message: context + inquiry.message }) });
      setSubmittedEmail(inquiry.email);
      setInquiry(emptyInquiry);
      setStatus({ type: "success", message: "Your project inquiry has been received. We’ll respond within one business day." });
    } catch (error) {
      setStatus({ type: "error", message: readableError(error) });
    }
  }

  if (status.type === "success") return (
    <section className="project-form inquiry-success" id="contact-form" aria-labelledby="inquiry-success-title">
      <span className="inquiry-success-mark" aria-hidden="true"><Check size={25} /></span>
      <h3 className="project-form-title" id="inquiry-success-title" tabIndex={-1} ref={successHeading}>Thank you. We have your inquiry.</h3>
      <p role="status">{status.message}</p>
      <p>We’ll reply to <strong>{submittedEmail}</strong>. You can share more details when we get in touch.</p>
      <button type="button" className="company-text-link" onClick={() => setStatus({ type: "idle", message: "" })}>Send another inquiry <ArrowUpRight size={17} aria-hidden="true" /></button>
      <p className="project-account-note">Already working with us? <Link href="/login">Open your client account</Link></p>
    </section>
  );

  return (
    <form className="project-form" id="contact-form" onSubmit={submitInquiry} aria-busy={status.type === "loading"} aria-describedby="inquiry-intro">
      <h3 className="project-form-title">Project inquiry</h3>
      <p className="project-form-intro" id="inquiry-intro">Start with your name, email and project goals. Company and budget details are optional.</p>
      <fieldset className="project-form-fields" aria-label="Project details" disabled={status.type === "loading"}>
      {interest && <div className="inquiry-interest"><div><span>{interest.type === "service" ? "Service interest" : "Reference project"}</span><strong>{interest.title}</strong></div><button type="button" aria-label="Remove inquiry topic" onClick={() => setInterest(null)}><X size={18} aria-hidden="true" /></button></div>}
      <div className="project-form-grid">
        <label>Name<input ref={nameInput} value={inquiry.name} onChange={(event) => setInquiry({ ...inquiry, name: event.target.value })} required minLength={2} maxLength={120} autoComplete="name" placeholder="Your name" /></label>
        <label>Email<input type="email" value={inquiry.email} onChange={(event) => setInquiry({ ...inquiry, email: event.target.value })} required maxLength={254} autoComplete="email" placeholder="you@example.com" /></label>
        <label className="project-message">Tell us about the system<textarea value={inquiry.message} onChange={(event) => setInquiry({ ...inquiry, message: event.target.value })} required minLength={10} maxLength={5000 - context.length} placeholder="Your goals, current challenges and preferred timeline" /></label>
      </div>
      <details className="inquiry-options"><summary>Add company and budget details <ChevronDown size={17} aria-hidden="true" /></summary><div className="project-form-grid">
        <label><span>Company <small>optional</small></span><input value={inquiry.company} onChange={(event) => setInquiry({ ...inquiry, company: event.target.value })} maxLength={160} autoComplete="organization" placeholder="Company or team" /></label>
        <label>
          <span>Budget range <small>optional</small></span>
          <input
            value={inquiry.budget}
            onChange={(event) => setInquiry({ ...inquiry, budget: event.target.value })}
            list="budget-ranges"
            maxLength={80}
            placeholder="Select or type a custom range"
            autoComplete="off"
          />
          <datalist id="budget-ranges">
            {budgetRanges.map((range) => <option key={range} value={range} />)}
          </datalist>
        </label>
      </div></details>
      {status.message && <div className={`form-alert is-${status.type}`} role="alert"><p>{status.message}</p><a href="mailto:akeluwasoftwarehub@gmail.com">You can also email your project details.</a></div>}
      <button className="contact-link" type="submit" disabled={status.type === "loading"}>
        {status.type === "loading" ? "Sending your inquiry…" : "Start a project with AKELUWA"} <ArrowUpRight size={18} aria-hidden="true" />
      </button>
      </fieldset>
      <p className="inquiry-privacy">We use these details to respond to your inquiry. <Link href="/privacy-policy">Privacy policy</Link></p>
      <p className="project-account-note">Already working with us? <Link href="/login">Open your client account</Link></p>
    </form>
  );
}
