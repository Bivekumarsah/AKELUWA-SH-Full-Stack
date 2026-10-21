import type { Metadata } from "next";
import { InnerPage } from "@/app/components/inner-page";
import { PublishedServices } from "@/app/components/published-content";
import { DeliveryProcess } from "@/app/components/delivery-process";
import { PageInvitation } from "@/app/components/page-invitation";

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
      title={<>Services built for<br /><em>your business.</em></>}
      intro="Software development, infrastructure, security and automation. Work with us on a complete project or bring focused support to your existing team."
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
      <section className="inner-section" aria-label="Project delivery stages"><DeliveryProcess /></section>
      <PageInvitation title="Not sure where to start?" description="Tell us about your current system and the problem you want to solve. We’ll help you identify the right next step." />
    </InnerPage>
  );
}
