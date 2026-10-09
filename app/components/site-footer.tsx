import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div className="footer-brand-block">
          <Link className="footer-brand" href="/" aria-label="AKELUWA SH home">
            <span className="footer-brand-logo" aria-hidden="true"><Image src="/company-logo.png" alt="" width={56} height={56} unoptimized /></span>
            <span className="footer-wordmark"><strong>AKELUWA</strong><small>Software hub</small></span>
          </Link>
          <p>A software hub building dependable digital products, cloud systems, cybersecurity foundations and practical AI.</p>
          <a className="footer-email" href="mailto:akeluwasoftwarehub@gmail.com">akeluwasoftwarehub@gmail.com ↗</a>
        </div>

        <nav className="footer-column" aria-label="Footer services and resources">
          <p>EXPLORE</p>
          <Link href="/services">Services</Link>
          <Link href="/case-studies">Our work</Link>
          <Link href="/careers">Careers</Link>
          <Link href="/downloads">Downloads</Link>
        </nav>

        <nav className="footer-column" aria-label="Footer company navigation">
          <p>COMPANY</p>
          <Link href="/about">About us</Link>
          <Link href="/#method">How we work</Link>
          <Link href="/contact">Start a project</Link>
          <Link href="/verify-contract">Verify a record</Link>
        </nav>

        <div className="footer-column footer-company-data">
          <p>COMPANY DETAILS</p>
          <span><small>BASE</small>Nepal / Remote worldwide</span>
          <span><small>WORKING WITH US</small>Scope and terms agreed in writing</span>
          <span><small>RESPONSE</small>Within one business day</span>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© 2026 AKELUWA SH. All rights reserved.</span>
        <nav className="footer-policy-links" aria-label="Legal"><Link href="/privacy-policy">Privacy policy</Link><Link href="/terms">Terms</Link></nav>
        <a href="#top">Back to top ↑</a>
      </div>
    </footer>
  );
}
