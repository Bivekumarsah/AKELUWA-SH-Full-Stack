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
    text: "Account authentication uses a necessary secure session cookie. With your permission, we also use Meta Pixel (ID 891396932267293) to measure page visits and the effectiveness of Facebook and Instagram advertising. Meta may process browsing information and set or read cookies under its own policies. The optional Pixel does not load until you select Accept optional tracking; selecting Decline leaves it disabled. Your choice is stored in this browser. To change your choice, clear this site\u0027s local storage and reload the page.",
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
