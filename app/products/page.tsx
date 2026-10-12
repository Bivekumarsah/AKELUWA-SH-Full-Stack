import type { Metadata } from "next";
import Link from "next/link";
import { InnerPage } from "@/app/components/inner-page";
import { PageInvitation } from "@/app/components/page-invitation";

export const metadata: Metadata = {
  title: "Our Products",
  description: "Explore digital products from AKELUWA Softwarehub, a registered Nepal-based software company: Akeluwa ToolBox and AKELUWA PublicInfoHub.",
  alternates: { canonical: "/products" },
};

export default function ProductsPage() {
  return (
    <InnerPage
      eyebrow="PRODUCTS / AKELUWA SOFTWAREHUB"
      title={<>Useful digital products.<br /><em>Built in Nepal.</em></>}
      intro="Explore the public-facing software products developed by AKELUWA Softwarehub, a registered company in Nepal."
    >
      <section className="inner-section split-proof" aria-labelledby="toolbox-heading">
        <div>
          <p className="section-label">ONLINE UTILITIES</p>
          <h2 id="toolbox-heading">Akeluwa ToolBox</h2>
        </div>
        <div className="inner-copy">
          <p>Practical browser-based tools for PDF documents, images, file conversion, and everyday digital work. Browse individual tools and their instructions before using them.</p>
          <p><Link href="/akeluwatoolbox/">Explore Akeluwa ToolBox →</Link></p>
        </div>
      </section>
      <section className="inner-section split-proof" aria-labelledby="publicinfo-heading">
        <div>
          <p className="section-label">NEPAL INFORMATION</p>
          <h2 id="publicinfo-heading">AKELUWA PublicInfoHub</h2>
        </div>
        <div className="inner-copy">
          <p>An independent directory of Nepal-related public-service links, government websites, office information, and citizen utilities. It is not a government agency or an official application portal; always verify procedures on the linked authority's website.</p>
          <p><Link href="/publicinfohub/">Explore PublicInfoHub →</Link></p>
        </div>
      </section>
      <PageInvitation title="Looking for a custom solution?" description="We also build custom software and digital systems for organizations. Tell us what you need." />
    </InnerPage>
  );
}
