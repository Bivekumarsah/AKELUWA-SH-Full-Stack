import type { Metadata } from "next";
import { InnerPage } from "@/app/components/inner-page";
import { PageInvitation } from "@/app/components/page-invitation";

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
      title={<>A software hub from Nepal.<br /><em>A partner for your team.</em></>}
      intro="AKELUWA SH exists for founders, teams and organizations that need dependable software with clear ownership."
    >
      <section className="inner-section split-proof">
        <div>
          <p className="section-label">OUR POSITION</p>
          <h2>Practical engineering. Clear responsibilities.</h2>
        </div>
        <div className="inner-copy">
          <p>We come from a place where constraints are real, so we design software that respects time, budget, security and maintainability from the beginning.</p>
          <p>Our work connects software engineering, cloud architecture, cybersecurity and practical AI into systems that can grow after launch.</p>
        </div>
      </section>

      <section className="inner-section company-principles" aria-label="Company principles">
        <article><span>01 / Responsibility</span><h2>Clear ownership</h2><p>Agree on scope, priorities and responsibilities so everyone understands what the project needs to achieve.</p></article>
        <article><span>02 / Collaboration</span><h2>Visible progress</h2><p>Review working software together. Use feedback to make decisions while the product is being built.</p></article>
        <article><span>03 / Continuity</span><h2>Beyond the handover</h2><p>Document the system and discuss how it will be maintained, supported and operated after delivery.</p></article>
      </section>
      <PageInvitation title="Let’s build a working relationship." description="Share your goals and meet the company through a conversation about your project." />
    </InnerPage>
  );
}
