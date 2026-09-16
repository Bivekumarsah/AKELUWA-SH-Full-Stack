import type { MetadataRoute } from "next";
import { absoluteURL, siteURL } from "@/app/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/account", "/login", "/register"],
      },
    ],
    sitemap: absoluteURL("/sitemap.xml"),
    host: siteURL,
  };
}
