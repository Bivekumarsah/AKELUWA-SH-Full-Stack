import type { ReactNode } from "react";
import { SiteFooter } from "@/app/components/site-footer";
import { SiteHeader } from "@/app/components/site-header";

type InnerPageProps = {
  eyebrow: string;
  title: ReactNode;
  intro: string;
  children: ReactNode;
};

export function InnerPage({ eyebrow, title, intro, children }: InnerPageProps) {
  return (
    <main className="inner-page" id="top">
      <SiteHeader />
      <section className="inner-hero">
        <p className="section-label">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{intro}</p>
      </section>
      {children}
      <SiteFooter />
    </main>
  );
}
