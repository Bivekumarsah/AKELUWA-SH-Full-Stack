import type { Metadata } from "next";
import { InnerPage } from "@/app/components/inner-page";
import { PublishedServices } from "@/app/components/published-content";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Software development, cloud and DevOps, cybersecurity, and AI automation services from AKELUWA SH.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <InnerPage
      eyebrow="SERVICES / SOFTWARE HUB"
      title={<>Services built for <em>real operations.</em></>}
      intro="AKELUWA SH connects product, infrastructure, security and intelligent automation so your system can launch cleanly and keep improving."
    >
      <PublishedServices />

      <section className="inner-section split-proof">
        <div>
          <p className="section-label">HOW WE WORK</p>
          <h2>Clear scope. Visible progress. Clean handover.</h2>
        </div>
        <div className="inner-copy">
          <p>Every engagement starts with the problem, the users, the risk and the operational goal. Then we define milestones, ownership and acceptance criteria before implementation moves.</p>
          <p>For long-term systems, we document setup, deployment, environment variables and admin responsibilities so your team is not left guessing after launch.</p>
        </div>
      </section>
    </InnerPage>
  );
}
