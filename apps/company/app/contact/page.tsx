import type { Metadata } from "next";
import { InnerPage } from "@/app/components/inner-page";
import { ProjectInquiryForm } from "@/app/components/project-inquiry-form";
import { ProjectNextSteps } from "@/app/components/project-next-steps";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact AKELUWA SH for software development, cloud systems, cybersecurity and AI automation projects.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const type: "service" | "project" = typeof params.service === "string" ? "service" : "project";
  const value = params[type];
  const title = typeof value === "string" ? value.replace(/[\r\n]/g, " ").trim().slice(0, 160) : "";
  const interest = title ? { type, title } : null;
  return (
    <InnerPage
      eyebrow="CONTACT / PROJECT INQUIRY"
      title={<>Start a project with <em>clarity.</em></>}
      intro="Tell us what you want to build, improve or secure. We respond with a clear next step within one business day."
    >
      <section className="inner-section contact-page-grid">
        <div className="contact-direct">
          <p className="section-label">Direct contact</p>
          <h2>Prefer email?</h2>
          <p>Send a short message with your project goal, timeline and budget range.</p>
          <a className="company-contact-email" href="mailto:akeluwasoftwarehub@gmail.com">akeluwasoftwarehub@gmail.com</a>
          <ProjectNextSteps />
        </div>
        <ProjectInquiryForm initialInterest={interest} key={`${type}:${title}`} />
      </section>
    </InnerPage>
  );
}
