import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div className="footer-brand-block">
          <Link className="footer-brand" href="/" aria-label="AKELUWA SH home">
            <span className="footer-brand-logo" aria-hidden="true"><Image src="/company-logo.png" alt="" width={56} height={56} unoptimized /></span>
            <strong>AKELUWA <i>SH</i></strong>
          </Link>
          <p>A software hub building dependable digital products, cloud systems, cybersecurity foundations and practical AI.</p>
          <a className="footer-email" href="mailto:akeluwasoftwarehub@gmail.com">akeluwasoftwarehub@gmail.com ↗</a>
        </div>

        <nav className="footer-column" aria-label="Footer capabilities">
          <p>CAPABILITIES</p>
          <Link href="/services#product-engineering">Product engineering</Link>
          <Link href="/services#cloud-devops">Cloud &amp; DevOps</Link>
          <Link href="/services#cybersecurity">Cybersecurity</Link>
          <Link href="/services#ai-automation">AI &amp; automation</Link>
        </nav>

        <nav className="footer-column" aria-label="Footer company navigation">
          <p>COMPANY</p>
          <Link href="/about">Our origin</Link>
          <Link href="/case-studies">Selected work</Link>
          <Link href="/#method">How we work</Link>
          <Link href="/contact">Start a project</Link>
          <Link href="/careers">Careers</Link>
          <Link href="/downloads">Downloads</Link>
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
          <p>We do not use tracking cookies. Read the full <Link href="/privacy-policy">privacy policy</Link> for how inquiry and account data are handled.</p>
        </details>
        <details id="terms">
          <summary>Terms of engagement <span>+</span></summary>
          <p>Project scope, timeline, payment, intellectual property, data handling and support are agreed in writing. Read the full <Link href="/terms">terms</Link>.</p>
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
