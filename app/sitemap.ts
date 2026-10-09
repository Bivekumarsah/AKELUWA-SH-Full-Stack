import type { MetadataRoute } from "next";
import { absoluteURL, publicRoutes } from "@/app/lib/site";
import toolboxRoutes from '@/toolbox/routes.json';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [...publicRoutes, { path: '/publicinfohub/', priority: 0.7 }, ...toolboxRoutes.map(route => ({ path: '/akeluwatoolbox' + route.path, priority: 0.7 }))].map((route) => ({
    url: absoluteURL(route.path),
    lastModified: now,
    changeFrequency: route.path === "/" ? "weekly" : "monthly",
    priority: route.priority,
  }));
}
