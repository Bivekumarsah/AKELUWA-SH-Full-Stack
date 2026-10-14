import { readFile, stat } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';

// The monorepo version serves bundled PublicInfoHub assets directly.
// No runtime Vercel upstream, external proxy, or separate database is required.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const root = resolve(process.cwd(), 'public', 'publicinfohub');
const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};
function extension(path: string) { return path.slice(path.lastIndexOf('.')); }

async function serve(request: Request, head = false): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === '/publicinfohub') {
    return Response.redirect(new URL('/publicinfohub/' + url.search, url.origin), 308);
  }
  const relative = url.pathname.slice('/publicinfohub/'.length);
  // Reject dotfiles, encoded slashes/backslashes, malformed paths and traversal.
  if (!url.pathname.startsWith('/publicinfohub/') || relative.includes('\\') ||
      relative.split('/').some(segment => segment === '..' || segment === '.' || segment.startsWith('.')) ||
      relative.includes('//')) {
    return new Response('Not found', { status: 404 });
  }
  const location = resolve(root, relative || 'index.html');
  if (location !== root && !location.startsWith(root + sep)) return new Response('Not found', { status: 404 });
  try {
    const info = await stat(location);
    const file = info.isDirectory() ? join(location, 'index.html') : location;
    const content = await readFile(file);
    return new Response(head ? null : content, {
      headers: {
        'content-type': types[extension(file)] || 'application/octet-stream',
        'cache-control': file.endsWith('.html') ? 'public, max-age=300' : 'public, max-age=3600',
        'x-content-type-options': 'nosniff',
      },
    });
  } catch {
    return new Response('PublicInfoHub page not found', { status: 404 });
  }
}

export function GET(request: Request) { return serve(request); }
export function HEAD(request: Request) { return serve(request, true); }
