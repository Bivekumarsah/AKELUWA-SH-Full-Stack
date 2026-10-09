import type { Metadata } from "next";
import { InnerPage } from "@/app/components/inner-page";
import { PublishedPortfolio } from "@/app/components/published-content";
import { PageInvitation } from "@/app/components/page-invitation";

export const metadata: Metadata = {
  title: "Case Studies",
  description:
    "Selected AKELUWA SH software systems, including fintech, cooperative management and cashless transit platforms.",
  alternates: { canonical: "/case-studies" },
};

export default function CaseStudiesPage() {
  return (
    <InnerPage
      eyebrow="CASE STUDIES / PROOF"
      title={<>Software we’ve built.<br /><em>Problems we’ve solved.</em></>}
      intro="Explore our published projects, the operations they support and the technologies behind them."
    >
      <PublishedPortfolio />
      <PageInvitation title="Have a similar challenge?" description="Tell us about your users, workflows and technical requirements. We can discuss how to approach your project." />
    </InnerPage>
  );
}
