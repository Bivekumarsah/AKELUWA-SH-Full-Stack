import type { NextConfig } from "next";
import toolboxRoutes from "./toolbox/routes.json";

const toolboxBase = "/akeluwatoolbox";

const nextConfig: NextConfig = {
  // Toolbox canonical URLs end in /; let these explicit rules preserve them.
  skipTrailingSlashRedirect: true,
  outputFileTracingIncludes: {
    "/akeluwatoolbox/*": ["./public/akeluwatoolbox/404.html"],
    "/publicinfohub/*": ["./public/publicinfohub/index.html", "./public/publicinfohub/styles.css", "./public/publicinfohub/app.js"],
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
      beforeFiles: toolboxRoutes.map(route => ({
        source: toolboxBase + route.path,
        destination: toolboxBase + route.path + "index.html",
      })),
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
