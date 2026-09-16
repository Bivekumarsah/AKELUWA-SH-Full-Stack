import type { Metadata } from "next";
import { InnerPage } from "@/app/components/inner-page";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Software development, cloud and DevOps, cybersecurity, and AI automation services from AKELUWA SH.",
  alternates: { canonical: "/services" },
};

const services = [
  {
    id: "product-engineering",
    number: "01",
    title: "Product engineering",
    text: "Web apps, dashboards, APIs, portals and operational software built around real workflows, not just feature lists.",
    stack: "React / Go / Django / Spring Boot / PostgreSQL",
  },
  {
    id: "cloud-devops",
    number: "02",
    title: "Cloud and DevOps",
    text: "Deployment pipelines, observability, containers and hosting architecture for systems that need to stay dependable.",
    stack: "Docker / CI-CD / Cloudflare / AWS-ready architecture",
  },
  {
    id: "cybersecurity",
    number: "03",
    title: "Cybersecurity foundation",
    text: "Authentication, authorization, secure configuration, rate limits, headers and safer data handling from the first release.",
    stack: "Session security / CSRF / Audit logs / Production checks",
  },
  {
    id: "ai-automation",
    number: "04",
    title: "AI and automation",
    text: "Practical AI features, admin assistance, data workflows and automation that reduce repeated manual work.",
    stack: "AI workflows / Data tools / Admin automation",
  },
];

export default function ServicesPage() {
  return (
    <InnerPage
      eyebrow="SERVICES / SOFTWARE HUB"
      title={<>Services built for <em>real operations.</em></>}
      intro="AKELUWA SH connects product, infrastructure, security and intelligent automation so your system can launch cleanly and keep improving."
    >
      <section className="inner-section service-list" aria-label="AKELUWA services">
        {services.map((service) => (
          <article id={service.id} className="inner-card service-card" key={service.id}>
            <span>{service.number}</span>
            <h2>{service.title}</h2>
            <p>{service.text}</p>
            <small>{service.stack}</small>
          </article>
        ))}
      </section>

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
