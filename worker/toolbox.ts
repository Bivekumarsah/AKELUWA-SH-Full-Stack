import routes from '../toolbox/routes.json';

const basePath = '/akeluwatoolbox';

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
  const isAsset = relative.startsWith('/assets/') || ['/site.webmanifest', '/sitemap.xml', '/robots.txt', '/googlefb3975d72926d897.html', '/404.html'].includes(relative);
  if (!assets) return new Response('Toolbox assets are unavailable', { status: 503 });
  if (!page && !isAsset) {
    // Asset HTML handling resolves the extensionless URL without redirecting it.
    const missing = new URL(basePath + '/404', url);
    const response = await assets.fetch(new Request(missing, { method: request.method }));
    return new Response(response.body, { status: 404, headers: response.headers });
  }
  return assets.fetch(request);
}
