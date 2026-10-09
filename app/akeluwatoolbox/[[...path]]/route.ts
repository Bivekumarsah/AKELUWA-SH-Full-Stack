import { readFile } from "node:fs/promises";
import path from "node:path";
import routes from "@/toolbox/routes.json";

// Canonical pages use static rewrites; public assets use filesystem routing.
// Handle missing slashes here because Next config redirects also match a
// trailing slash, which would redirect canonical URLs back to themselves.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const base = "/akeluwatoolbox";
  const relative = url.pathname.slice(base.length);
  const page = routes.find(route => route.path.slice(0, -1) === relative);
  if (page) {
    url.pathname = base + page.path;
    return Response.redirect(url, 308);
  }

  // The filename is constant: URL input never selects a filesystem path.
  const html = await readFile(path.join(process.cwd(), "public", "akeluwatoolbox", "404.html"), "utf8");
  return new Response(html, {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
