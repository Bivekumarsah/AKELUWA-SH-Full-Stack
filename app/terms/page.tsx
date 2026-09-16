import type { Metadata } from "next";
import { InnerPage } from "@/app/components/inner-page";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "Terms of engagement for AKELUWA SH software projects, project scope, payment, handover and support.",
  alternates: { canonical: "/terms" },
};

const terms = [
  {
    title: "Project scope",
    text: "Scope, milestones, responsibilities and acceptance criteria are agreed in writing before delivery begins.",
  },
  {
    title: "Payment and timeline",
    text: "Payment schedule, delivery timeline and revision boundaries are defined per project or formal agreement.",
  },
  {
    title: "Intellectual property",
    text: "Ownership, licensing and third-party dependencies are clarified in the project agreement before handover.",
  },
  {
    title: "Support",
    text: "Maintenance, bug-fix windows, hosting support and ongoing development are agreed separately based on the system's needs.",
  },
];

export default function TermsPage() {
  return (
    <InnerPage
      eyebrow="TERMS / ENGAGEMENT"
      title={<>Clear terms before <em>delivery moves.</em></>}
      intro="These general terms describe how AKELUWA SH frames project work. A written project agreement controls the final details."
    >
      <section className="inner-section legal-stack">
        {terms.map((item) => (
          <article className="inner-card" key={item.title}>
            <h2>{item.title}</h2>
            <p>{item.text}</p>
          </article>
        ))}
      </section>
    </InnerPage>
  );
}
