import type { MetadataRoute } from "next";
import { absoluteURL, siteURL } from "@/app/lib/site";

export default function robots(): MetadataRoute.Robots {
  // Keep private account routes out of all search crawlers, including AI search bots.
  const excluded = ["/admin", "/account", "/login", "/register", "/verify-email", "/forgot-password", "/reset-password"];
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: excluded },
      { userAgent: "OAI-SearchBot", allow: "/", disallow: excluded },
      { userAgent: "PerplexityBot", allow: "/", disallow: excluded },
    ],
    sitemap: absoluteURL("/sitemap.xml"),
    host: siteURL,
  };
}
