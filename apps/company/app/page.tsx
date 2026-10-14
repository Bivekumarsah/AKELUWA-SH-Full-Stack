"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Code2, Cloud, ShieldCheck, Workflow } from "lucide-react";
import { ProjectInquiryForm } from "@/app/components/project-inquiry-form";
import { SiteFooter } from "@/app/components/site-footer";
import { SiteHeader } from "@/app/components/site-header";
import { apiFetch, CompanyBrand, PortfolioItem, Service } from "@/app/lib/api";
import { ContentStatus } from "@/app/components/published-content";
import { usePublishedContent } from "@/app/lib/use-published-content";
import { PortfolioCard } from "@/app/components/portfolio-card";
import { ServiceCard } from "@/app/components/service-card";
import { DeliveryProcess } from "@/app/components/delivery-process";
import { ProjectNextSteps } from "@/app/components/project-next-steps";
import { withToolbox } from '@/app/lib/toolbox';

const fallbackBrand: CompanyBrand = {
  display_name: "AKELUWA SH",
  tagline: "A software team you can work with.",
  tagline_meaning: "Based in Nepal, we work with founders and organizations to build software, manage infrastructure and improve everyday operations.",
};

const expertise = [
  { title: "Software", description: "Applications & business systems", inquiry: "Software development", icon: Code2 },
  { title: "Cloud", description: "Infrastructure & deployment", inquiry: "Cloud infrastructure", icon: Cloud },
  { title: "Security", description: "Access & data protection", inquiry: "Cybersecurity", icon: ShieldCheck },
  { title: "Automation", description: "AI & everyday workflows", inquiry: "AI and workflow automation", icon: Workflow },
];

const featuredFreeTools = [
  { title: "Free digital stamp maker", href: "/akeluwatoolbox/digital-stamp-maker/", description: "Design an authorized round or business stamp with an instant preview and download as PNG or SVG." },
  { title: "Compress PDF online", href: "/akeluwatoolbox/compress-pdf/", description: "Reduce PDF file size for email and forms. Compare actual savings and check readability before downloading." },
  { title: "Compress photo to 100 KB", href: "/akeluwatoolbox/compress-photo/", description: "Choose a photo size target, including 20, 50, 100 or 200 KB, then inspect the result before saving." },
  { title: "Edit PDF online free", href: "/akeluwatoolbox/pdf-editor/", description: "Add text, images and business logos to a PDF in your browser; preview the pages before exporting." },
  { title: "Nepali Unicode to Preeti converter", href: "/akeluwatoolbox/extra-tools/unicode-preeti/", description: "Convert Nepali Unicode and legacy Preeti text for everyday document workflows. Review the result before use." },
];

export default function Home() {
  const servicesContent = usePublishedContent<Service>("services");
  const portfolioContent = usePublishedContent<PortfolioItem>("portfolio");
  const [companyBrand, setCompanyBrand] = useState<CompanyBrand>(fallbackBrand);

  useEffect(() => {
    let active = true;
    apiFetch<{ company_brand: CompanyBrand }>("/company-brand")
      .then(({ company_brand: brand }) => {
        if (active) setCompanyBrand({
          display_name: brand.display_name.trim() || fallbackBrand.display_name,
          tagline: brand.tagline.trim() || fallbackBrand.tagline,
          tagline_meaning: brand.tagline_meaning.trim() || fallbackBrand.tagline_meaning,
        });
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  return (
    <main className="company-site" id="top">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <SiteHeader />
      <section className="company-hero company-container" id="main-content" tabIndex={-1}>
        <div className="company-hero-copy">
          <p className="company-eyebrow">Software development &amp; technology services</p>
          <h1>Software built for<br /><span>your business.</span></h1>
          <p className="company-hero-intro">From your first application to the systems your team runs every day. We design, develop and maintain software around the way your business works.</p>
          <div className="company-actions">
            <Link className="company-button" href="/contact">Discuss your project <ArrowRight size={18} aria-hidden="true" /></Link>
            <Link className="company-text-link" href="#portfolio">Explore our work <ArrowUpRight size={18} aria-hidden="true" /></Link>
          </div>
          <p className="company-location"><span aria-hidden="true" className="company-location-mark" />Based in Nepal. Working with teams worldwide.</p>
        </div>
        <aside className="company-capabilities" aria-label="Our areas of expertise">
          <p className="company-eyebrow">Engineering from end to end</p>
          <h2>One team.<br />The whole build.</h2>
          <ul>
            {expertise.map(({ title, description, inquiry, icon: Icon }) => <li key={title}><Link href={`/contact?service=${encodeURIComponent(inquiry)}`} aria-label={`Discuss ${inquiry.toLowerCase()}`}><Icon size={22} aria-hidden="true" /><div><span>{title}<ArrowUpRight size={16} aria-hidden="true" /></span><small>{description}</small></div></Link></li>)}
          </ul>
          <p className="company-capabilities-note">Choose an area to discuss your project.</p>
        </aside>
      </section>
      <section className="company-section company-services" id="systems" aria-labelledby="services-title">
        <div className="company-container">
          <div className="company-section-heading">
            <div><p className="company-eyebrow">Our services</p><h2 id="services-title">The right support<br />for your next step.</h2></div>
            <div><p>Build a new product, improve an existing system or bring specialist engineering support to your team.</p><Link className="company-text-link" href="/services">View all services <ArrowRight size={18} aria-hidden="true" /></Link></div>
          </div>
          <div className="system-list company-service-list">
            <ContentStatus {...servicesContent} empty={!servicesContent.items.length} />
            {servicesContent.items.slice(0, 4).map((service, index) => <ServiceCard service={service} index={index} key={service.id} />)}
          </div>
        </div>
      </section>
      <section className="company-section company-container" id="portfolio" aria-labelledby="work-title">
        <div className="company-section-heading">
          <div><p className="company-eyebrow">Projects</p><h2 id="work-title">What we’ve built.</h2></div>
          <div><p>A look at our published projects and the business problems they address.</p><Link className="company-text-link" href="/case-studies">See our work <ArrowRight size={18} aria-hidden="true" /></Link></div>
        </div>
        <div className="company-work-grid">
          <ContentStatus {...portfolioContent} empty={!portfolioContent.items.length} emptyMessage="No additional projects are published yet." />
          {withToolbox(portfolioContent.items).slice(0, 3).map((item, index) => <PortfolioCard item={item} index={index} key={item.id} />)}
        </div>
      </section>
      <section className="company-section company-services" id="free-tools" aria-labelledby="free-tools-title">
        <div className="company-container">
          <div className="company-section-heading">
            <div><p className="company-eyebrow">Akeluwa ToolBox</p><h2 id="free-tools-title">Free tools for everyday files.</h2></div>
            <div><p>Edit PDFs, prepare small photos, create authorized business stamps and convert Nepali text directly in your browser.</p><Link className="company-text-link" href="/akeluwatoolbox/">Explore all 21 free tools <ArrowRight size={18} aria-hidden="true" /></Link></div>
          </div>
          <div className="company-service-list">
            {featuredFreeTools.map(({ title, href, description }) => <article className="company-service" key={href}>
              <h3><Link href={href}>{title} <ArrowUpRight size={18} aria-hidden="true" /></Link></h3>
              <p>{description}</p>
            </article>)}
          </div>
        </div>
      </section>
      <section className="company-section company-method" id="method" aria-labelledby="method-title">
        <div className="company-container">
          <div className="company-section-heading">
            <div><p className="company-eyebrow">How we work</p><h2 id="method-title">A clear process.<br />A shared understanding.</h2></div>
            <p>You should know what is being built, why it matters and what comes next. We make those decisions with you.</p>
          </div>
          <DeliveryProcess />
        </div>
      </section>
      <section className="company-section company-container company-about" id="origin" aria-labelledby="about-title">
        <div><p className="company-eyebrow">About {companyBrand.display_name}</p><h2 id="about-title">Built in Nepal.<br />Built to work with you.</h2><Link className="company-text-link" href="/about">Meet the company <ArrowRight size={18} aria-hidden="true" /></Link></div>
        <div className="company-about-detail"><h3 className="company-brand-tagline">{companyBrand.tagline}</h3><p className="brand-tagline-meaning">{companyBrand.tagline_meaning}</p><dl className="company-facts"><div><dt>Based in</dt><dd>Nepal</dd></div><div><dt>Working together</dt><dd>Remote, worldwide</dd></div><div><dt>Project foundation</dt><dd>Scope agreed in writing</dd></div></dl></div>
      </section>
      <section className="company-section company-contact" id="contact" aria-labelledby="contact-title">
        <div className="company-container company-contact-grid">
          <div className="company-contact-copy"><p className="company-eyebrow">Let’s talk</p><h2 id="contact-title">Tell us what<br />you’re working on.</h2><p>A new idea, a system that needs improvement or a specific engineering challenge. Tell us where you want to go.</p><a className="company-contact-email" href="mailto:akeluwasoftwarehub@gmail.com">akeluwasoftwarehub@gmail.com</a><div className="company-actions"><a className="company-text-link" href="#contact-form">Use the form <ArrowRight size={18} aria-hidden="true" /></a></div><ProjectNextSteps /></div>
          <ProjectInquiryForm />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
