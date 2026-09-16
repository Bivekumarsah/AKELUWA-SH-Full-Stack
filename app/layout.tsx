import type { Metadata } from "next";
import { absoluteURL, siteURL } from "@/app/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteURL),
  title: {
    default: "AKELUWA SH - Software Hub",
    template: "%s | AKELUWA SH",
  },
  description:
    "A modern software hub for product engineering, cloud systems, cybersecurity and AI.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "AKELUWA SH - Software Hub",
    description: "We engineer the invisible edge.",
    type: "website",
    url: siteURL,
    siteName: "AKELUWA SH",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "AKELUWA SH - We engineer the invisible edge.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AKELUWA SH - Software Hub",
    description: "We engineer the invisible edge.",
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
    name: "AKELUWA SH",
    url: siteURL,
    logo: absoluteURL("/company-logo.png"),
    email: "akeluwasoftwarehub@gmail.com",
    areaServed: "Worldwide",
    address: {
      "@type": "PostalAddress",
      addressCountry: "NP",
    },
  };

  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        {children}
      </body>
    </html>
  );
}
