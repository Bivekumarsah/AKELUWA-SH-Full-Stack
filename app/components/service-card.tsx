import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { Service } from "@/app/lib/api";
import { TechnologyList } from "@/app/components/technology-list";

export function ServiceCard({ service, index, detailed = false }: { service: Service; index: number; detailed?: boolean }) {
  const Heading = detailed ? "h2" : "h3";
  return (
    <article className={`company-service${detailed ? " company-service-detailed" : ""}`} id={detailed ? service.slug : undefined}>
      <div className="company-service-number"><span>{service.number || String(index + 1).padStart(2, "0")}</span><span>Expertise</span></div>
      <Heading>{detailed ? service.title : <Link href={`/services#${service.slug}`}>{service.title}<ArrowUpRight size={20} aria-hidden="true" /></Link>}</Heading>
      <p>{service.summary}</p>
      {service.stack && <div className="company-service-tools"><p>Tools &amp; technologies</p><TechnologyList value={service.stack} label="Service technologies" /></div>}
      {detailed && <Link className="company-text-link" href={`/contact?service=${encodeURIComponent(service.title)}`}>Discuss this service <ArrowRight size={17} aria-hidden="true" /></Link>}
    </article>
  );
}
