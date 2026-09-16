import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer" id="trust">
      <div className="footer-trust-band">
        <div className="footer-trust-icon" aria-hidden="true">
          <svg viewBox="0 0 28 32">
            <path d="M14 1.5 25 5.8v8.5c0 7.4-4.3 12.7-11 16.2-6.7-3.5-11-8.8-11-16.2V5.8L14 1.5Z" />
            <path d="m8.8 15.8 3.1 3.2 7.4-7.5" />
          </svg>
        </div>
        <div>
          <span>AKELUWA TRUST STANDARD / 001</span>
          <strong>Clarity before code. Security by design. Ownership without ambiguity.</strong>
        </div>
        <p><i /> PROCESS ACTIVE</p>
      </div>

      <div className="footer-grid">
        <div className="footer-brand-block">
          <a className="footer-brand" href="#top" aria-label="AKELUWA SH home">
            <span className="footer-brand-logo" aria-hidden="true"><Image src="/company-logo.png" alt="" width={56} height={56} unoptimized /></span>
            <strong>AKELUWA <i>SH</i></strong>
          </a>
          <p>A software hub building dependable digital products, cloud systems, cybersecurity foundations and practical AI.</p>
          <a className="footer-email" href="mailto:akeluwasoftwarehub@gmail.com">akeluwasoftwarehub@gmail.com ↗</a>
        </div>

        <nav className="footer-column" aria-label="Footer capabilities">
          <p>CAPABILITIES</p>
          <a href="#systems">Product engineering</a>
          <a href="#systems">Cloud &amp; DevOps</a>
          <a href="#systems">Cybersecurity</a>
          <a href="#systems">AI &amp; automation</a>
        </nav>

        <nav className="footer-column" aria-label="Footer company navigation">
          <p>COMPANY</p>
          <a href="#origin">Our origin</a>
          <a href="#portfolio">Selected work</a>
          <a href="#method">How we work</a>
          <a href="#contact">Start a project</a>
          <Link href="/login">Client login</Link>
        </nav>

        <div className="footer-column footer-company-data">
          <p>COMPANY DETAILS</p>
          <span><small>BASE</small>Nepal / Remote worldwide</span>
          <span><small>AVAILABILITY</small>New projects / 2026</span>
          <span><small>OFFICIAL DETAILS</small>Provided with formal agreement</span>
          <span><small>RESPONSE</small>Within one business day</span>
        </div>
      </div>

      <div className="footer-assurance" aria-label="AKELUWA client assurances">
        <article><span>01</span><strong>Secure by design</strong><p>Security, access and data handling are considered from the architecture stage.</p></article>
        <article><span>02</span><strong>Transparent delivery</strong><p>Scope, milestones, responsibilities and changes are made visible before work moves.</p></article>
        <article><span>03</span><strong>Human accountability</strong><p>Every engagement has clear ownership, direct communication and a written handover.</p></article>
      </div>

      <div className="footer-legal">
        <details id="privacy">
          <summary>Privacy &amp; data care <span>+</span></summary>
          <p>We do not use tracking cookies. When you submit an inquiry, we store the details you provide so we can respond and manage the project conversation. Account authentication uses a necessary secure session cookie.</p>
        </details>
        <details id="terms">
          <summary>Terms of engagement <span>+</span></summary>
          <p>Project scope, timeline, payment, intellectual property, data handling and support are agreed in writing before delivery begins.</p>
        </details>
      </div>

      <div className="footer-bottom">
        <span>© 2026 AKELUWA SH. ALL RIGHTS RESERVED.</span>
        <span>SOFTWARE HUB / NEPAL / GLOBAL DELIVERY</span>
        <a href="#top">BACK TO TOP ↑</a>
      </div>
    </footer>
  );
}
