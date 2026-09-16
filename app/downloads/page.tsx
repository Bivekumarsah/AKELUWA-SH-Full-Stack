import type { Metadata } from "next";
import { InnerPage } from "@/app/components/inner-page";
import PublicDownloads from "@/app/components/public-downloads";

export const metadata: Metadata = { title: "Downloads", description: "Download AKELUWA SH company profiles, service documents and project resources.", alternates: { canonical: "/downloads" } };

export default function DownloadsPage() {
  return <InnerPage eyebrow="DOWNLOADS / RESOURCES" title={<>Resources for a cleaner <em>project start.</em></>} intro="Download company profiles, service documents and project preparation materials published by AKELUWA SH."><PublicDownloads /></InnerPage>;
}
