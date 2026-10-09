// Proxy only PublicInfoHub pages and assets to its independently deployed app.
// This keeps PublicInfoHub's source code out of the company repository.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_ORIGIN = "https://publicinfohub.vercel.app";

async function proxyPublicInfoHub(request: Request): Promise<Response> {
  const incomingUrl = new URL(request.url);
  const origin = (process.env.PUBLIC_INFO_HUB_ORIGIN || DEFAULT_ORIGIN).replace(/\/$/, "");
  let upstreamUrl: URL;

  try {
    upstreamUrl = new URL(origin);
    if (upstreamUrl.protocol !== "https:" || upstreamUrl.pathname !== "/" || upstreamUrl.search || upstreamUrl.hash) {
      throw new Error("Expected an HTTPS origin without path or query");
    }
    upstreamUrl.pathname = incomingUrl.pathname;
    upstreamUrl.search = incomingUrl.search;
  } catch {
    return new Response("PublicInfoHub origin is not configured correctly", { status: 503 });
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers: { accept: request.headers.get("accept") || "*/*" },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });

    const headers = new Headers();
    for (const name of ["content-type", "cache-control", "etag", "last-modified"]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    // Keep browser URLs on the company domain, including upstream redirects.
    const location = upstream.headers.get("location");
    if (location && upstream.status >= 300 && upstream.status < 400) {
      const resolved = new URL(location, upstreamUrl);
      if (resolved.origin === upstreamUrl.origin) {
        headers.set("location", resolved.pathname + resolved.search + resolved.hash);
      } else {
        headers.set("location", location);
      }
    }

    return new Response(request.method === "HEAD" ? null : upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch {
    return new Response("PublicInfoHub is temporarily unavailable", {
      status: 502,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
}

export async function GET(request: Request) {
  return proxyPublicInfoHub(request);
}

export async function HEAD(request: Request) {
  return proxyPublicInfoHub(request);
}
