"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteHeader() {
  const pathname = usePathname();
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
          <span className="company-wordmark"><strong>AKELUWA</strong><small>Software hub</small></span>
        </Link>
      </div>
      <nav className="nova-nav" aria-label="Primary navigation">
        <Link href="/services" aria-current={pathname === "/services" ? "page" : undefined}>Services</Link>
        <Link href="/case-studies" aria-current={pathname === "/case-studies" ? "page" : undefined}>Our work</Link>
        <Link href="/about" aria-current={pathname === "/about" ? "page" : undefined}>About</Link>
      </nav>
      <div className="nova-header-actions">
        <Link className="nova-header-login" href="/login">Sign in</Link>
        <Link className="nova-header-cta" href="/contact">
          Contact us <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
      <button ref={toggle} className="mobile-nav-toggle" type="button" aria-label={open ? "Close navigation" : "Open navigation"} title={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)}>
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>
      <nav id="mobile-navigation" className="mobile-navigation" aria-label="Mobile navigation" hidden={!open} onClick={() => setOpen(false)}>
        <Link href="/services" aria-current={pathname === "/services" ? "page" : undefined}>Services</Link>
        <Link href="/case-studies" aria-current={pathname === "/case-studies" ? "page" : undefined}>Our work</Link>
        <Link href="/about" aria-current={pathname === "/about" ? "page" : undefined}>About</Link>
        <Link href="/careers" aria-current={pathname === "/careers" ? "page" : undefined}>Careers</Link>
        <Link href="/downloads" aria-current={pathname === "/downloads" ? "page" : undefined}>Downloads</Link>
        <Link href="/contact" aria-current={pathname === "/contact" ? "page" : undefined}>Contact us</Link>
        <Link href="/login">Sign in</Link>
      </nav>
    </header>
  );
}
