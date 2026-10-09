import type { NextConfig } from "next";
import toolboxRoutes from "./toolbox/routes.json";

const toolboxBase = "/akeluwatoolbox";
// PublicInfoHub is owned and deployed by its separate GitHub/Vercel project.
const publicInfoHubOrigin = (process.env.PUBLIC_INFO_HUB_ORIGIN || "https://publicinfohub.vercel.app").replace(/\/$/, "");

const nextConfig: NextConfig = {
  // Toolbox canonical URLs end in /; let these explicit rules preserve them.
  skipTrailingSlashRedirect: true,
  outputFileTracingIncludes: {
    "/akeluwatoolbox/*": ["./public/akeluwatoolbox/404.html"],
  },
  async redirects() {
    const uniqueTools = toolboxRoutes.filter((route, index, all) =>
      route.tool !== "home" && all.findIndex(other => other.tool === route.tool) === index);
    return [
      { source: "/publicinfohub", destination: "/publicinfohub/", permanent: true },
      ...uniqueTools.map(route => ({
        source: toolboxBase + "/",
        has: [{ type: "query" as const, key: "tool", value: route.tool }],
        destination: toolboxBase + route.path,
        permanent: true,
      })),
      ...toolboxRoutes.map(route => ({
          source: toolboxBase + route.path + "index.html",
          destination: toolboxBase + route.path,
          permanent: true,
      })),
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        ...toolboxRoutes.map(route => ({
          source: toolboxBase + route.path,
          destination: toolboxBase + route.path + "index.html",
        })),
        { source: "/publicinfohub/", destination: `${publicInfoHubOrigin}/publicinfohub/` },
        { source: "/publicinfohub/:path*", destination: `${publicInfoHubOrigin}/publicinfohub/:path*` },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  // Cloudflare serves these local assets directly; its local worker does not
  // provide the production image-transform binding used by Vinext.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
