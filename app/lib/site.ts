export const siteURL = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.NODE_ENV === "development"
    ? "http://localhost:5173"
    : "https://akeluwa-sh.com");

export const publicRoutes = [
  { path: "/", priority: 1 },
  { path: "/services", priority: 0.9 },
  { path: "/about", priority: 0.8 },
  { path: "/case-studies", priority: 0.8 },
  { path: "/contact", priority: 0.8 },
  { path: "/privacy-policy", priority: 0.5 },
  { path: "/terms", priority: 0.5 },
  { path: "/careers", priority: 0.5 },
  { path: "/downloads", priority: 0.5 },
];

export function absoluteURL(path: string) {
  return new URL(path, siteURL).toString();
}
