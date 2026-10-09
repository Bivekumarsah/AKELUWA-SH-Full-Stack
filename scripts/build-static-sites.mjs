import { buildStatic } from '../toolbox/scripts/build-static.mjs';

// Keep the existing Toolbox build unchanged. PublicInfoHub is deployed separately
// and served through Next.js rewrites defined in next.config.ts.
await buildStatic(new URL('../public/akeluwatoolbox/', import.meta.url), {
  basePath: '/akeluwatoolbox',
  origin: process.env.TOOLBOX_SITE_URL || 'https://www.akeluwasoftwarehub.com.np',
});
