import { buildStatic } from '../toolbox/scripts/build-static.mjs';

// Canonicals stay on the public company domain even in a local preview.
await buildStatic(new URL('../public/akeluwatoolbox/', import.meta.url), {
  basePath: '/akeluwatoolbox',
  origin: process.env.TOOLBOX_SITE_URL || 'https://www.akeluwasoftwarehub.com.np',
});
