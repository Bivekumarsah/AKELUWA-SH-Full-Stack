"use client";

import { FormEvent, useState } from "react";
import { apiFetch, readableError } from "@/app/lib/api";

const emptyInquiry = { name: "", email: "", company: "", budget: "", message: "" };
const budgetRanges = ["Under $2,500", "$2,500-$10,000", "$10,000-$25,000", "$25,000+"];

export function ProjectInquiryForm() {
  const [inquiry, setInquiry] = useState(emptyInquiry);
  const [status, setStatus] = useState<{
    type: "idle" | "loading" | "success" | "error";
    message: string;
  }>({ type: "idle", message: "" });

  async function submitInquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ type: "loading", message: "" });
    try {
      await apiFetch("/inquiries", { method: "POST", body: JSON.stringify(inquiry) });
      setInquiry(emptyInquiry);
      setStatus({ type: "success", message: "Your project inquiry has been received. We’ll respond within one business day." });
    } catch (error) {
      setStatus({ type: "error", message: readableError(error) });
    }
  }

  return (
    <form className="project-form" id="contact-form" onSubmit={submitInquiry}>
      <div className="project-form-grid">
        <label>Name<input value={inquiry.name} onChange={(event) => setInquiry({ ...inquiry, name: event.target.value })} required minLength={2} maxLength={120} autoComplete="name" placeholder="Your name" /></label>
        <label>Email<input type="email" value={inquiry.email} onChange={(event) => setInquiry({ ...inquiry, email: event.target.value })} required maxLength={254} autoComplete="email" placeholder="you@example.com" /></label>
        <label>Company <small>optional</small><input value={inquiry.company} onChange={(event) => setInquiry({ ...inquiry, company: event.target.value })} maxLength={160} autoComplete="organization" placeholder="Company or team" /></label>
        <label>
          Budget range <small>optional</small>
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
        <label className="project-message">Tell us about the system<textarea value={inquiry.message} onChange={(event) => setInquiry({ ...inquiry, message: event.target.value })} required minLength={10} maxLength={5000} placeholder="What are you building, improving, or securing?" /></label>
      </div>
      {status.message && <p className={`form-alert is-${status.type}`} role={status.type === "error" ? "alert" : "status"}>{status.message}</p>}
      <button className="contact-link" type="submit" disabled={status.type === "loading"}>
        {status.type === "loading" ? "Sending your inquiry…" : "Start a project with AKELUWA"} <span aria-hidden="true">↗</span>
      </button>
      <p className="project-account-note">Already working with us? <a href="/login">Open your client account</a></p>
    </form>
  );
}
