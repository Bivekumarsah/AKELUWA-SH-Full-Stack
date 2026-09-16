import type { MetadataRoute } from "next";
import { absoluteURL, publicRoutes } from "@/app/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return publicRoutes.map((route) => ({
    url: absoluteURL(route.path),
    lastModified: now,
    changeFrequency: route.path === "/" ? "weekly" : "monthly",
    priority: route.priority,
  }));
}
