import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { PortfolioItem } from "@/app/lib/api";
import { TechnologyList } from "@/app/components/technology-list";

type PortfolioCardProps = {
  item: PortfolioItem;
  index: number;
  headingLevel?: "h2" | "h3";
};

export function PortfolioCard({ item, index, headingLevel = "h3" }: PortfolioCardProps) {
  const Heading = headingLevel;
  const internalProject = item.project_url?.startsWith('/') && !item.project_url.startsWith('//');

  return (
    <article className={`project-card${index === 0 ? " project-card-featured" : ""}`}>
      <div className="project-card-main">
        <p className="project-card-kicker"><span>{String(index + 1).padStart(2, "0")}</span>{index === 0 ? "Featured project" : "Selected project"}</p>
        <Heading>{internalProject ? <a href={item.project_url}>{item.title}</a> : item.title}</Heading>
        <p className="project-card-description">{item.summary}</p>
      </div>
      <div className="project-card-details">
        {item.technologies.trim() && <div><p className="project-card-detail-label">Built with</p><TechnologyList value={item.technologies} label="Project technologies" /></div>}
        {item.project_url && (
          <a className="company-text-link" href={item.project_url} target={internalProject ? undefined : '_blank'} rel={internalProject ? undefined : 'noreferrer'}>{item.id === 'akeluwa-toolbox' ? 'Open AkeluwaToolBox' : 'View project'} <ArrowUpRight size={17} aria-hidden="true" /></a>
        )}
        <Link className="company-text-link project-inquiry-link" href={`/contact?project=${encodeURIComponent(item.title)}`}>Discuss a similar project <ArrowRight size={17} aria-hidden="true" /></Link>
      </div>
    </article>
  );
}
