import type { Metadata } from "next";
import { InnerPage } from "@/app/components/inner-page";

export const metadata: Metadata = {
  title: "Case Studies",
  description:
    "Selected AKELUWA SH software systems, including fintech, cooperative management and cashless transit platforms.",
  alternates: { canonical: "/case-studies" },
};

const cases = [
  {
    title: "Fintech transaction platform",
    summary: "Secure account, transfer and transaction services designed for traceability and dependable delivery.",
    outcome: "Cleaner money movement, stronger auditability and safer account operations.",
    stack: "Go / PostgreSQL / Docker",
  },
  {
    title: "Cooperative management system",
    summary: "Member, savings, loan, collection and reporting workflows connected in one operational system.",
    outcome: "Reduced manual tracking and clearer reporting for day-to-day cooperative operations.",
    stack: "Django / React / PostgreSQL",
  },
  {
    title: "Cashless public transport",
    summary: "RFID-based fare payments, wallet services and live administration for public transportation.",
    outcome: "Faster fare collection and a foundation for cash-light transit operations.",
    stack: "Spring Boot / Android / RFID",
  },
];

export default function CaseStudiesPage() {
  return (
    <InnerPage
      eyebrow="CASE STUDIES / PROOF"
      title={<>Proof that lives beyond <em>the pitch.</em></>}
      intro="A closer view of the types of systems AKELUWA SH builds: operational, secure and designed to keep working after launch."
    >
      <section className="inner-section case-grid" aria-label="Selected case studies">
        {cases.map((item, index) => (
          <article className="inner-card case-card" key={item.title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h2>{item.title}</h2>
            <p>{item.summary}</p>
            <div>
              <small>OUTCOME</small>
              <strong>{item.outcome}</strong>
            </div>
            <small>{item.stack}</small>
          </article>
        ))}
      </section>
    </InnerPage>
  );
}
