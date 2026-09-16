"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ProjectInquiryForm } from "@/app/components/project-inquiry-form";
import { SiteFooter } from "@/app/components/site-footer";
import { SiteHeader } from "@/app/components/site-header";
import { apiFetch, PortfolioItem, Service } from "@/app/lib/api";

type DisplayService = Pick<Service, "number" | "title" | "stack"> & { copy: string };
type ProofPoint = { label: string; value: string };

const fallbackSystems: DisplayService[] = [
  {
    number: "01",
    title: "Build the product",
    copy: "Interfaces, platforms and financial systems shaped around real human behaviour—not feature lists.",
    stack: "REACT / DJANGO / SPRING BOOT",
  },
  {
    number: "02",
    title: "Move through cloud",
    copy: "Deployment, observability and automation engineered to stay calm while the business moves fast.",
    stack: "AWS / DEVOPS / PLATFORM",
  },
  {
    number: "03",
    title: "Defend the system",
    copy: "Security and intelligent automation designed into the architecture from the first line of code.",
    stack: "CYBERSECURITY / AI / DATA",
  },
];

const fallbackPortfolio: PortfolioItem[] = [
  { id: "fintech", slug: "fintech-api", title: "Fintech transaction platform", summary: "Secure account, transfer and transaction services designed for traceability and dependable delivery.", technologies: "GO / POSTGRESQL / DOCKER", position: 1, active: true, created_at: "", updated_at: "" },
  { id: "cooperative", slug: "cooperative-system", title: "Cooperative management system", summary: "Member, savings, loan, collection and reporting workflows connected in one operational system.", technologies: "DJANGO / REACT / POSTGRESQL", position: 2, active: true, created_at: "", updated_at: "" },
  { id: "transit", slug: "cashless-transit", title: "Cashless public transport", summary: "RFID-based fare payments, wallet services and live administration for public transportation.", technologies: "SPRING BOOT / ANDROID / RFID", position: 3, active: true, created_at: "", updated_at: "" },
];

const fallbackProof: ProofPoint[][] = [
  [
    { label: "Focus", value: "Traceable money movement" },
    { label: "Outcome", value: "Safer account operations" },
  ],
  [
    { label: "Focus", value: "Member workflow clarity" },
    { label: "Outcome", value: "Cleaner reporting cycles" },
  ],
  [
    { label: "Focus", value: "Fast fare collection" },
    { label: "Outcome", value: "Cash-light transit flow" },
  ],
];

export default function Home() {
  const [pulse, setPulse] = useState(72);
  const [introActive, setIntroActive] = useState(true);
  const [systems, setSystems] = useState<DisplayService[]>(fallbackSystems);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(fallbackPortfolio);

  useEffect(() => {
    const root = document.documentElement;
    const handlePointer = (event: PointerEvent) => {
      root.style.setProperty("--pointer-x", `${event.clientX}px`);
      root.style.setProperty("--pointer-y", `${event.clientY}px`);
    };
    window.addEventListener("pointermove", handlePointer, { passive: true });

    const ticker = window.setInterval(() => {
      setPulse(68 + Math.floor(Math.random() * 10));
    }, 1800);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const introTimer = window.setTimeout(() => setIntroActive(false), reduceMotion ? 80 : 2300);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("is-visible");
        });
      },
      { threshold: 0.14 },
    );
    document.querySelectorAll(".scroll-reveal").forEach((item) => observer.observe(item));

    apiFetch<{ services: Service[] }>("/services")
      .then((data) => {
        if (data.services.length) setSystems(data.services.map((item) => ({ number: item.number, title: item.title, copy: item.summary, stack: item.stack })));
      })
      .catch(() => undefined);
    apiFetch<{ portfolio: PortfolioItem[] }>("/portfolio")
      .then((data) => { if (data.portfolio.length) setPortfolio(data.portfolio); })
      .catch(() => undefined);

    return () => {
      window.removeEventListener("pointermove", handlePointer);
      window.clearInterval(ticker);
      window.clearTimeout(introTimer);
      observer.disconnect();
    };
  }, []);

  return (
    <main>
      <a className="skip-link" href="#contact">Skip to contact</a>
      <div className="heritage-motion" aria-hidden="true">
        <div className="heritage-pan">
          <span />
          <span />
        </div>
        <div className="heritage-data">
          <i /><i /><i /><i /><i /><i />
        </div>
      </div>
      <div className="cursor-light" aria-hidden="true" />

      <button
        className={`origin-intro ${introActive ? "is-active" : "is-gone"}`}
        onClick={() => setIntroActive(false)}
        aria-label="Enter the AKELUWA SH website"
        tabIndex={introActive ? 0 : -1}
      >
        <span className="intro-kicker">INITIALISING ORIGIN SIGNAL / 001</span>
        <span className="intro-word" aria-hidden="true">AKELUWA<i>SH</i></span>
        <span className="intro-route" aria-hidden="true">
          <b>SOFTWARE</b><i /><b>UI/UX</b><i /><b>CLOUD</b><i /><b>AI</b>
        </span>
        <span className="intro-progress"><i /></span>
        <span className="intro-skip">CLICK TO ENTER ↗</span>
      </button>

      <SiteHeader />

      <section className="nova-hero" id="top">
        <div className="hero-micro hero-micro-left" aria-hidden="true">
          <span>27.7172° N</span>
          <span>85.3240° E</span>
        </div>

        <div className="hero-supersign" aria-hidden="true">AKELUWA</div>

        <div className="origin-copy">
          <p className="origin-badge reveal-one">
            <span>THE ORIGIN / 001</span>
            <i />
            <span>SOFTWARE HUB / AI ENGINEERING</span>
          </p>
          <h1>
            <span className="origin-line reveal-two">We engineer</span>
            <span className="origin-line edge-line reveal-three">the invisible <em>edge.</em></span>
          </h1>
          <div className="origin-bottom reveal-four">
            <div className="origin-message">
              <p>
                AKELUWA SH turns ambitious ideas into software, cloud systems and
                intelligent products that move without borders.
              </p>
              <div className="trust-mark" aria-label="AKELUWA trust protocol: secure, transparent and accountable">
                <svg viewBox="0 0 28 32" aria-hidden="true">
                  <path d="M14 1.5 25 5.8v8.5c0 7.4-4.3 12.7-11 16.2-6.7-3.5-11-8.8-11-16.2V5.8L14 1.5Z" />
                  <path d="m8.8 15.8 3.1 3.2 7.4-7.5" />
                </svg>
                <span><small>ACTIVE</small><strong>Secure · Transparent · Accountable</strong></span>
              </div>
            </div>
            <a href="#origin" className="signal-cta">
              <span>FOLLOW THE SIGNAL</span><b aria-hidden="true">↓</b>
            </a>
          </div>
        </div>

        <aside className="origin-core reveal-four" aria-label="AKELUWA origin signal visualisation">
          <div className="core-meta">
            <span>ORIGIN SIGNAL</span>
            <span className="core-live"><i /> LIVE</span>
          </div>

          <div className="core-stage">
            <svg className="core-svg" viewBox="0 0 520 520" aria-hidden="true">
              <circle className="core-ring ring-a" cx="260" cy="260" r="198" />
              <circle className="core-ring ring-b" cx="260" cy="260" r="145" />
              <circle className="core-ring ring-c" cx="260" cy="260" r="91" />
              <path className="core-axis" d="M260 22V498M22 260H498" />
              <path className="core-thread thread-a" d="M64 350 C160 318 142 194 260 260 S390 214 458 100" />
              <path className="core-thread thread-b" d="M92 116 C182 150 168 285 260 260 S352 336 442 396" />
              <path className="core-thread thread-c" d="M260 62 C205 150 326 186 260 260 S194 365 260 458" />
              <circle className="core-node node-nepal" cx="92" cy="116" r="6" />
              <circle className="core-node node-madhesh" cx="260" cy="260" r="10" />
              <circle className="core-node node-world" cx="442" cy="396" r="6" />
              <circle className="core-pulse" cx="260" cy="260" r="24" />
            </svg>
            <span className="core-label label-nepal">SOFTWARE / BUILD</span>
            <span className="core-label label-madhesh">CLOUD / SCALE</span>
            <span className="core-label label-world">AI / INTELLIGENCE</span>
            <div className="core-center"><Image src="/company-logo.png" alt="" width={96} height={96} priority unoptimized /><i>001</i></div>
            <div className="core-readout"><span>CORE PULSE</span><strong>{pulse}%</strong></div>
          </div>
        </aside>

        <div className="origin-strip">
          <span>SOFTWARE / HUB</span>
          <span>CLOUD / ACTIVE 001</span>
          <span>AI DELIVERY / INTELLIGENT</span>
          <span>UTC +05:45</span>
        </div>
      </section>

      <section className="founding-section" id="origin">
        <div className="founding-rail" aria-hidden="true">
          <span>01</span>
          <i />
          <span>ORIGIN</span>
        </div>
        <div className="founding-content">
          <p className="section-label scroll-reveal">WHY AKELUWA EXISTS / NEPAL → WORLD</p>
          <h2 className="founding-statement scroll-reveal">
            The future should not
            <br />
            be <em>imported.</em>
          </h2>
          <div className="founding-story scroll-reveal">
            <div className="story-lead">
              <span className="story-mark">न</span>
              <p>
                We come from a place the technology world rarely looks toward.
                That taught us to notice what it misses.
              </p>
            </div>
            <div className="story-body">
              <p>
                AKELUWA SH is a modern software hub: precise in engineering,
                intelligent in automation and global in execution.
              </p>
              <p>
                We connect software development, cloud architecture, cybersecurity and AI
                into systems that understand complexity, access and scale.
              </p>
            </div>
          </div>
          <div className="identity-signal scroll-reveal" aria-label="AKELUWA technology fields">
            <span>FULL-STACK SYSTEMS</span><i>×</i><span>UI/UX</span><i>×</i><span>CLOUD ENGINEERING</span><i>×</i><span>AI INTELLIGENCE</span>
          </div>
          <div className="origin-facts scroll-reveal">
            <div><strong>01</strong><span>ORIGIN<br />MANY DESTINATIONS</span></div>
            <div><strong>24/7</strong><span>GLOBAL<br />SYSTEM MINDSET</span></div>
            <div><strong>∞</strong><span>AMBITION<br />WITHOUT BORDER</span></div>
          </div>
        </div>
      </section>

      <section className="systems-section" id="systems">
        <div className="section-rail" aria-hidden="true">
          <span>02</span>
          <span>SYSTEMS</span>
        </div>
        <div className="systems-content">
          <div className="section-intro scroll-reveal">
            <p className="section-label">CAPABILITY FIELD / 2026</p>
            <h2>
              From first line
              <br />
              <em>to global uptime.</em>
            </h2>
            <p className="intro-copy">
              One team connects product, engineering, cloud and security. No lost
              context between the idea and the infrastructure carrying it.
            </p>
          </div>

          <div className="system-list">
            {systems.map((system) => (
              <article className="system-row scroll-reveal" key={system.number}>
                <span className="system-number">{system.number}</span>
                <h3>{system.title}</h3>
                <p>{system.copy}</p>
                <span className="system-stack">{system.stack}</span>
                <span className="system-arrow" aria-hidden="true">↗</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="portfolio-section" id="portfolio">
        <div className="section-rail" aria-hidden="true">
          <span>03</span>
          <span>PORTFOLIO</span>
        </div>
        <div className="portfolio-content">
          <div className="portfolio-heading scroll-reveal">
            <p className="section-label">SELECTED SYSTEMS / BUILT WITH PURPOSE</p>
            <h2>Proof that lives<br /><em>beyond the pitch.</em></h2>
            <p>Products shaped around real operations, clear ownership and technology that can grow after launch.</p>
          </div>
          <div className="portfolio-grid">
            {portfolio.map((item, index) => (
              <article className="portfolio-card scroll-reveal" key={item.slug}>
                <div><span>{String(index + 1).padStart(2, "0")}</span><i>{item.technologies}</i></div>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
                <div className="portfolio-proof" aria-label={`${item.title} proof points`}>
                  {(fallbackProof[index] ?? fallbackProof[0]).map((proof) => (
                    <span key={proof.label}>
                      <small>{proof.label}</small>
                      {proof.value}
                    </span>
                  ))}
                </div>
                {item.project_url ? <a href={item.project_url} target="_blank" rel="noreferrer">View project ↗</a> : <span className="portfolio-private">PRIVATE DELIVERY / CASE SUMMARY</span>}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="principle-section" id="method">
        <div className="section-rail" aria-hidden="true">
          <span>04</span>
          <span>METHOD</span>
        </div>
        <div className="principle-content">
          <p className="section-label scroll-reveal">THE AKELUWA STANDARD / 004</p>
          <h2 className="scroll-reveal">
            Local instinct.
            <br />
            <em>World-class systems.</em>
          </h2>
          <div className="principle-grid scroll-reveal">
            <p>
              Our origin gives us empathy for real constraints. Our engineering
              turns that empathy into products that are secure, fast and beautifully clear.
            </p>
            <div className="principle-stat"><strong>04</strong><span>disciplines working as one system</span></div>
            <div className="principle-stat"><strong>01</strong><span>standard from Nepal to the world</span></div>
          </div>
        </div>
      </section>

      <div className="tech-marquee" aria-label="Technology capabilities">
        <div>
          <span>SOFTWARE ENGINEERING</span><i>✳</i><span>CLOUD NATIVE</span><i>✳</i><span>AI INTELLIGENCE</span><i>✳</i><span>SECURE BY DESIGN</span><i>✳</i>
          <span>SOFTWARE ENGINEERING</span><i>✳</i><span>CLOUD NATIVE</span><i>✳</i><span>AI INTELLIGENCE</span><i>✳</i><span>SECURE BY DESIGN</span><i>✳</i>
        </div>
      </div>

      <section className="contact-section" id="contact">
        <div className="section-rail contact-rail" aria-hidden="true">
          <span>05</span>
          <span>CONTACT</span>
        </div>
        <div className="contact-content scroll-reveal">
          <div className="contact-heading">
            <p className="section-label">CONTACT US / PROJECT INQUIRY</p>
            <h2>Contact us<br /><em>build with clarity.</em></h2>
            <p className="contact-copy">
              Tell us what you want to build, improve or secure. We will review the
              signal and come back with a clear next step.
            </p>
            <div className="contact-promises" aria-label="Contact response details">
              <span><small>RESPONSE</small>Within one business day</span>
              <span><small>DELIVERY</small>Nepal / Remote worldwide</span>
            </div>
            <div className="contact-actions" aria-label="Contact shortcuts">
              <a href="mailto:akeluwasoftwarehub@gmail.com">Email us</a>
              <a href="#contact-form">Use the form</a>
            </div>
          </div>
          <ProjectInquiryForm />
          <div className="contact-foot">
            <span>RESPONSE WITHIN ONE BUSINESS DAY</span>
            <span>NEPAL / REMOTE WORLDWIDE</span>
            <a href="#top">BACK TO TOP ↑</a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
