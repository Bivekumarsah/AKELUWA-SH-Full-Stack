const basePath = '/publicinfohub';

// Static PublicInfoHub files are generated into public/publicinfohub during prebuild.
// Preserve all nested office and utility URLs, not just the old four-file prototype.
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
  if (!assets) return new Response('PublicInfoHub assets are unavailable', { status: 503 });
  return assets.fetch(request);
}
