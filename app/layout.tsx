import type { Metadata } from "next";
import "./globals.css";

const siteURL = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.NODE_ENV === "development"
    ? "http://localhost:5173"
    : "https://novastack-it-concept-0824.bibekgupta9844.chatgpt.site");

export const metadata: Metadata = {
  metadataBase: new URL(siteURL),
  title: "AKELUWA SH — Software Hub",
  description:
    "A modern software hub for product engineering, cloud systems, cybersecurity and AI.",
  openGraph: {
    title: "AKELUWA SH — Software Hub",
    description: "We engineer the invisible edge.",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "AKELUWA SH — We engineer the invisible edge.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AKELUWA SH — Software Hub",
    description: "We engineer the invisible edge.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
