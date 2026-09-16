import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="nova-header">
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
        <Link href="/#trust">Trust</Link>
      </nav>
      <Link className="nova-header-cta" href="/contact">
        <i /> Build with us <span aria-hidden="true">↗</span>
      </Link>
    </header>
  );
}
