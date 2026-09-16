import type { Metadata } from "next";
import { InnerPage } from "@/app/components/inner-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy policy for AKELUWA SH inquiries, account sessions and project communication.",
  alternates: { canonical: "/privacy-policy" },
};

const sections = [
  {
    title: "Information we collect",
    text: "When you submit an inquiry, we collect the name, email, company, budget range and message you provide. If you create an account, we store the account details needed for authentication and project communication.",
  },
  {
    title: "How we use it",
    text: "We use this information to respond to inquiries, manage project conversations, provide account access and protect the platform from abuse.",
  },
  {
    title: "Cookies",
    text: "We do not use tracking cookies. Account authentication uses a necessary secure session cookie so signed-in users can access protected areas.",
  },
  {
    title: "Data care",
    text: "We limit access to project and inquiry information to people responsible for communication, delivery or administration. Formal project agreements can define additional handling requirements.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <InnerPage
      eyebrow="POLICY / DATA CARE"
      title={<>Privacy with <em>clear boundaries.</em></>}
      intro="This page explains how AKELUWA SH handles inquiry, account and project communication data."
    >
      <section className="inner-section legal-stack">
        {sections.map((section) => (
          <article className="inner-card" key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.text}</p>
          </article>
        ))}
      </section>
    </InnerPage>
  );
}
