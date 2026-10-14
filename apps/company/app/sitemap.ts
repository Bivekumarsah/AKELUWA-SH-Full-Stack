import type { MetadataRoute } from "next";
import { absoluteURL, publicRoutes } from "@/app/lib/site";
import toolboxRoutes from '@/toolbox/routes.json';
import extraTools from '@/toolbox/extra-tools/catalog.json';

export default function sitemap(): MetadataRoute.Sitemap {
  // Do not claim every tool was modified at request time. Add lastModified
  // only when a reliable per-page publication/update timestamp is available.

  const hubPages = [
    '/publicinfohub/', '/publicinfohub/offices/', '/publicinfohub/utilities/',
    ...['bs-ad-date-converter','nepal-age-calculator','nepal-tax-ssf-calculator',
      'official-form-finder','document-checklist-guides','government-office-map',
      'nepal-holiday-calendar','official-exam-portal-directory']
      .map(slug => '/publicinfohub/utilities/' + slug + '/'),
  ];
  return [...publicRoutes, ...hubPages.map(path => ({ path, priority: 0.7 })), ...toolboxRoutes.map(route => ({ path: '/akeluwatoolbox' + route.path, priority: 0.7 })), ...['/extra-tools/', ...extraTools.map(tool => '/extra-tools/' + tool.slug + '/')].map(path => ({ path: '/akeluwatoolbox' + path, priority: 0.7 }))].map((route) => ({
    url: absoluteURL(route.path),
    changeFrequency: route.path === "/" ? "weekly" : "monthly",
    priority: route.priority,
  }));
}
