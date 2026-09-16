import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare serves these local assets directly; its local worker does not
  // provide the production image-transform binding used by Vinext.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
