const basePath = '/publicinfohub';
const publicFiles = new Set(['/', '/index.html', '/styles.css', '/app.js']);

/** Serve the isolated PublicInfoHub static prototype from the company domain. */
export async function servePublicInfoHub(request: Request, assets?: Fetcher): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== basePath && !url.pathname.startsWith(basePath + '/')) return null;
  if (!['GET', 'HEAD'].includes(request.method)) {
    return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  }
  if (url.pathname === basePath) {
    url.pathname += '/';
    return Response.redirect(url.toString(), 308);
  }
  const relative = url.pathname.slice(basePath.length);
  if (!publicFiles.has(relative)) {
    return new Response('PublicInfoHub page not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
  if (!assets) return new Response('PublicInfoHub assets are unavailable', { status: 503 });
  return assets.fetch(request);
}
