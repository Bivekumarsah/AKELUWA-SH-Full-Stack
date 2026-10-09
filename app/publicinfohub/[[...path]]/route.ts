export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.pathname === '/publicinfohub') {
    url.pathname = '/publicinfohub/';
    return Response.redirect(url, 308);
  }
  return new Response('PublicInfoHub page not found', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
