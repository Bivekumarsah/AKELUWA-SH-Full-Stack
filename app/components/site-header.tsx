"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const header = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); toggle.current?.focus(); }
    };
    const outside = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", outside);
    return () => { document.removeEventListener("keydown", close); document.removeEventListener("pointerdown", outside); };
  }, [open]);
  return (
    <header className="nova-header" ref={header}>
      <div className="brand-lockup">
        <Link className="nova-brand" href="/" aria-label="AKELUWA SH home">
          <span className="nova-brand-mark" aria-hidden="true">
            <Image src="/company-logo.png" alt="" width={48} height={48} priority unoptimized />
          </span>
          <span><strong>AKELUWA</strong> SH</span>
        </Link>
        <span className="header-trust-badge" aria-label="AKELUWA symbol of trust">
          <svg viewBox="0 0 28 32" aria-hidden="true">
            <path d="M14 1.5 25 5.8v8.5c0 7.4-4.3 12.7-11 16.2-6.7-3.5-11-8.8-11-16.2V5.8L14 1.5Z" />
            <path d="m8.8 15.8 3.1 3.2 7.4-7.5" />
          </svg>
          <span><strong>TRUST</strong></span>
        </span>
      </div>
      <nav className="nova-nav" aria-label="Primary navigation">
        <Link href="/about">About</Link>
        <Link href="/services">Services</Link>
        <Link href="/case-studies">Case studies</Link>
      </nav>
      <div className="nova-header-actions">
        <Link className="nova-header-login" href="/login">Sign in</Link>
        <Link className="nova-header-cta" href="/contact">
          <i /> Build with us <span aria-hidden="true">↗</span>
        </Link>
      </div>
      <button ref={toggle} className="mobile-nav-toggle" type="button" aria-label={open ? "Close navigation" : "Open navigation"} title={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)}>
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>
      <nav id="mobile-navigation" className="mobile-navigation" aria-label="Mobile navigation" hidden={!open} onClick={() => setOpen(false)}>
        <Link href="/about">About</Link><Link href="/services">Services</Link>
        <Link href="/case-studies">Case studies</Link><Link href="/careers">Careers</Link>
        <Link href="/downloads">Downloads</Link><Link href="/contact">Build with us</Link>
        <Link href="/login">Sign in</Link>
      </nav>
    </header>
  );
}
