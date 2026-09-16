import type { Metadata } from "next";
import { InnerPage } from "@/app/components/inner-page";
import PublicCareers from "@/app/components/public-careers";

export const metadata: Metadata = { title: "Careers", description: "Career and internship opportunities at AKELUWA SH for software, cloud, security and AI talent.", alternates: { canonical: "/careers" } };

export default function CareersPage() {
  return <InnerPage eyebrow="CAREERS / TALENT" title={<>Build systems that teach you <em>discipline.</em></>} intro="Explore published roles, internships and collaboration opportunities at AKELUWA SH."><PublicCareers /></InnerPage>;
}
