import type { MetadataRoute } from "next";
import { absoluteURL, publicRoutes } from "@/app/lib/site";
import toolboxRoutes from '@/toolbox/routes.json';
import extraTools from '@/toolbox/extra-tools/catalog.json';

export default function sitemap(): MetadataRoute.Sitemap {
  // Keep the independent PublicInfoHub's real, canonical content URLs discoverable.
  const publicInfoPages = [
    "/publicinfohub/",
    "/publicinfohub/offices/",
    "/publicinfohub/utilities/",
    ...[
      "bs-ad-date-converter",
      "nepal-age-calculator",
      "nepal-tax-ssf-calculator",
      "official-form-finder",
      "document-checklist-guides",
      "government-office-map",
      "nepal-holiday-calendar",
      "official-exam-portal-directory",
    ].map(slug => `/publicinfohub/utilities/${slug}/`),
  ];

  return [...publicRoutes, ...publicInfoPages.map(path => ({ path, priority: path === "/publicinfohub/" ? 0.7 : 0.6 })), ...toolboxRoutes.map(route => ({ path: '/akeluwatoolbox' + route.path, priority: 0.7 })), ...['/extra-tools/', ...extraTools.map(tool => '/extra-tools/' + tool.slug + '/')].map(path => ({ path: '/akeluwatoolbox' + path, priority: 0.7 }))].map((route) => ({
    url: absoluteURL(route.path),
    // Avoid a fake lastModified timestamp on every request.
    changeFrequency: route.path === "/" ? "weekly" : "monthly",
    priority: route.priority,
  }));
}
