import type { Metadata } from "next";
import { InnerPage } from "@/app/components/inner-page";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about AKELUWA SH, a Nepal-based software hub building product, cloud, security and AI systems for global delivery.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <InnerPage
      eyebrow="ABOUT / AKELUWA SH"
      title={<>A software hub from Nepal, built for <em>global systems.</em></>}
      intro="AKELUWA SH exists for founders, teams and organizations that need dependable software with clear ownership."
    >
      <section className="inner-section split-proof">
        <div>
          <p className="section-label">OUR POSITION</p>
          <h2>Local instinct. World-class execution.</h2>
        </div>
        <div className="inner-copy">
          <p>We come from a place where constraints are real, so we design software that respects time, budget, security and maintainability from the beginning.</p>
          <p>Our work connects software engineering, cloud architecture, cybersecurity and practical AI into systems that can grow after launch.</p>
        </div>
      </section>

      <section className="inner-section metric-row" aria-label="Company principles">
        <article><strong>01</strong><span>Secure by design</span></article>
        <article><strong>02</strong><span>Transparent delivery</span></article>
        <article><strong>03</strong><span>Human accountability</span></article>
        <article><strong>04</strong><span>Global mindset</span></article>
      </section>
    </InnerPage>
  );
}
