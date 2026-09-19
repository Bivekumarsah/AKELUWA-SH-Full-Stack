import type { Metadata } from "next";
import { InnerPage } from "@/app/components/inner-page";
import { PublishedPortfolio } from "@/app/components/published-content";

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
      title={<>Proof that lives beyond <em>the pitch.</em></>}
      intro="A closer view of the types of systems AKELUWA SH builds: operational, secure and designed to keep working after launch."
    >
      <PublishedPortfolio />
    </InnerPage>
  );
}
