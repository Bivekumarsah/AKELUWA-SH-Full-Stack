import { readFile } from "node:fs/promises";
import path from "node:path";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.pathname === '/publicinfohub') {
    url.pathname = '/publicinfohub/';
    return Response.redirect(url, 308);
  }
  if (url.pathname === '/publicinfohub/') {
    const html = await readFile(path.join(process.cwd(), 'public', 'publicinfohub', 'index.html'), 'utf8');
    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
  return new Response('PublicInfoHub page not found', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
