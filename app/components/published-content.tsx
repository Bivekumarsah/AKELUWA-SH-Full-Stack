"use client";

import { RefreshCw } from "lucide-react";
import { PortfolioItem, Service } from "@/app/lib/api";
import { usePublishedContent } from "@/app/lib/use-published-content";
import { PortfolioCard } from "@/app/components/portfolio-card";
import { ServiceCard } from "@/app/components/service-card";
import { withToolbox } from '@/app/lib/toolbox';

export function ContentStatus({ loading, error, empty, retry, emptyMessage = 'No items are published yet.' }: { loading: boolean; error: boolean; empty: boolean; retry: () => void; emptyMessage?: string }) {
  if (loading) return <p className="content-status" role="status">Loading published content...</p>;
  if (error) return <div className="content-status" role="alert"><p>Published content is temporarily unavailable.</p><button type="button" onClick={retry}><RefreshCw size={16} />Try again</button></div>;
  if (empty) return <p className="content-status">{emptyMessage}</p>;
  return null;
}

export function PublishedServices() {
  const content = usePublishedContent<Service>("services");
  return <section className="inner-section service-list" aria-label="AKELUWA services">
    <ContentStatus {...content} empty={!content.items.length} />
    {content.items.map((item, index) => <ServiceCard service={item} index={index} detailed key={item.id} />)}
  </section>;
}

export function PublishedPortfolio() {
  const content = usePublishedContent<PortfolioItem>("portfolio");
  return <section className="inner-section company-work-grid" aria-label="Selected case studies">
    <ContentStatus {...content} empty={!content.items.length} emptyMessage="No additional projects are published yet." />
    {withToolbox(content.items).map((item, index) => <PortfolioCard item={item} index={index} headingLevel="h2" key={item.id} />)}
  </section>;
}
