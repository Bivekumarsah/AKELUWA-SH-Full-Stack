import type { Metadata } from "next";
import { InnerPage } from "@/app/components/inner-page";
import { ProjectInquiryForm } from "@/app/components/project-inquiry-form";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact AKELUWA SH for software development, cloud systems, cybersecurity and AI automation projects.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <InnerPage
      eyebrow="CONTACT / PROJECT INQUIRY"
      title={<>Start a project with <em>clarity.</em></>}
      intro="Tell us what you want to build, improve or secure. We respond with a clear next step within one business day."
    >
      <section className="inner-section contact-page-grid">
        <div className="inner-card contact-direct">
          <span>DIRECT CONTACT</span>
          <h2>Prefer email?</h2>
          <p>Send a short message with your project goal, timeline and budget range.</p>
          <a href="mailto:akeluwasoftwarehub@gmail.com">akeluwasoftwarehub@gmail.com ↗</a>
        </div>
        <ProjectInquiryForm />
      </section>
    </InnerPage>
  );
}
