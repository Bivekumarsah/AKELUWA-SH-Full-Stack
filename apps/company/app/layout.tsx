import type { Metadata } from "next";
import { Suspense } from "react";
import MetaPixel from "@/app/components/meta-pixel";
import { absoluteURL, siteURL } from "@/app/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteURL),
  applicationName: "AKELUWA Softwarehub",
  // Keep a machine-readable language declaration alongside <html lang="en">.
  other: { "content-language": "en" },
  title: {
    default: "AKELUWA Softwarehub | Software Development & IT Services",
    template: "%s | AKELUWA Softwarehub",
  },
  description:
    "AKELUWA Softwarehub is a Nepal-based software development and IT services company offering custom software, web applications, cloud solutions, cybersecurity and AI automation.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "AKELUWA Softwarehub | Software Development & IT Services",
    description: "Software development, cloud infrastructure, security and automation from Nepal.",
    type: "website",
    locale: "en_NP",
    url: siteURL,
    siteName: "AKELUWA Softwarehub",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "AKELUWA Softwarehub - Building Smart Digital Solutions.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AKELUWA Softwarehub | Software Development & IT Services",
    description: "Software development, cloud infrastructure, security and automation from Nepal.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": absoluteURL("/#organization"),
    name: "AKELUWA Softwarehub",
    url: siteURL,
    logo: absoluteURL("/company-logo.png"),
    email: "akeluwasoftwarehub@gmail.com",
    areaServed: "Worldwide",
    address: {
      "@type": "PostalAddress",
      addressCountry: "NP",
    },
  };
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteURL("/#website"),
    url: siteURL,
    name: "AKELUWA Softwarehub",
    inLanguage: "en",
    publisher: { "@id": absoluteURL("/#organization") },
  };

  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@graph": [organizationSchema, websiteSchema] }).replace(/</g, "\\u003c") }}
        />
        {children}
        <Suspense fallback={null}>
          <MetaPixel />
        </Suspense>
      </body>
    </html>
  );
}
