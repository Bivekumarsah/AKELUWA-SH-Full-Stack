import routes from '../toolbox/routes.json';
import extraTools from '../toolbox/extra-tools/catalog.json';

const basePath = '/akeluwatoolbox';
const extraPaths = ['/extra-tools/', ...extraTools.map(tool => '/extra-tools/' + tool.slug + '/')];

// Static tool pages use full-document navigation, separate from the company React router.
export async function serveToolbox(request: Request, assets?: Fetcher): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== basePath && !url.pathname.startsWith(basePath + '/')) return null;
  if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  if (url.pathname === basePath) {
    url.pathname += '/';
    return Response.redirect(url.toString(), 308);
  }
  const relative = url.pathname.slice(basePath.length);
  const page = routes.find(route => route.path === relative || route.path === relative + '/' || route.path + 'index.html' === relative);
  if (page) {
    const legacyTool = relative === '/' ? url.searchParams.get('tool') : null;
    const destination = legacyTool && routes.find(route => route.tool === legacyTool);
    if (destination || relative !== page.path) {
      url.pathname = basePath + (destination ? destination.path : page.path);
      if (destination) url.searchParams.delete('tool');
      return Response.redirect(url.toString(), 308);
    }
  }

  // The extensionless extra-tool URLs must be served from the same static asset
  // binding as the core tools, including in the local Cloudflare/Vite worker.
  const extra = extraPaths.find(path => path === relative || path.slice(0, -1) === relative || path + 'index.html' === relative);
  if (extra && extra !== relative) {
    url.pathname = basePath + extra;
    return Response.redirect(url.toString(), 308);
  }
  const isAsset = relative.startsWith('/assets/') || ['/site.webmanifest', '/sitemap.xml', '/robots.txt', '/googlefb3975d72926d897.html', '/404.html'].includes(relative);
  if (!assets) return new Response('Toolbox assets are unavailable', { status: 503 });
  if (!page && !extra && !isAsset) {
    // Asset HTML handling resolves the extensionless URL without redirecting it.
    const missing = new URL(basePath + '/404', url);
    const response = await assets.fetch(new Request(missing, { method: request.method }));
    return new Response(response.body, { status: 404, headers: response.headers });
  }
  return assets.fetch(request);
}
