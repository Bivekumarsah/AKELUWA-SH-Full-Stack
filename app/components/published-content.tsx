"use client";

import { RefreshCw } from "lucide-react";
import { PortfolioItem, Service } from "@/app/lib/api";
import { usePublishedContent } from "@/app/lib/use-published-content";

export function ContentStatus({ loading, error, empty, retry }: { loading: boolean; error: boolean; empty: boolean; retry: () => void }) {
  if (loading) return <p className="content-status" role="status">Loading published content...</p>;
  if (error) return <div className="content-status" role="alert"><p>Published content is temporarily unavailable.</p><button type="button" onClick={retry}><RefreshCw size={16} />Try again</button></div>;
  if (empty) return <p className="content-status">No items are published yet.</p>;
  return null;
}

export function PublishedServices() {
  const content = usePublishedContent<Service>("services");
  return <section className="inner-section service-list" aria-label="AKELUWA services">
    <ContentStatus {...content} empty={!content.items.length} />
    {content.items.map((item) => <article id={item.slug} className="inner-card service-card" key={item.id}><span>{item.number}</span><h2>{item.title}</h2><p>{item.summary}</p><small>{item.stack}</small></article>)}
  </section>;
}

export function PublishedPortfolio() {
  const content = usePublishedContent<PortfolioItem>("portfolio");
  return <section className="inner-section case-grid" aria-label="Selected case studies">
    <ContentStatus {...content} empty={!content.items.length} />
    {content.items.map((item, index) => <article className="inner-card case-card" key={item.id}><span>{String(index + 1).padStart(2, "0")}</span><h2>{item.title}</h2><p>{item.summary}</p><small>{item.technologies}</small>{item.project_url && <a className="inner-link" href={item.project_url} target="_blank" rel="noreferrer">View project</a>}</article>)}
  </section>;
}
