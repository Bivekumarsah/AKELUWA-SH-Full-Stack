# Company-domain toolbox

The company application owns `/`, authentication, customer/admin pages and its Go API configuration. AkeluwaToolBox owns `/akeluwatoolbox/` and its ten static pages. It uses native anchor navigation from company project cards so the React router does not request an RSC payload for static HTML.

The toolbox card is present in server-rendered homepage and case-study HTML. It does not require a database seed or administrator account. The list helper suppresses API records that duplicate its title, slug or local URL. Other published projects retain their original behavior, including external links opening in a new tab.

## Source and builds

- Edit standalone browser source in the parent `website/` directory, then run `node scripts/sync-company-toolbox.mjs` from the parent workspace.
- This copies browser files and upstream license notices into this project's tracked `toolbox/` directory. No Python service, virtual environment, Git metadata, or `.env` file is copied.
- `npm run dev` and `npm run build` generate the ignored `public/akeluwatoolbox/` subtree through `scripts/build-toolbox.mjs`. The company project can build independently of the parent workspace.
- The shared static generator supports an explicit base path and limits cleanup to its own generated output directories. It validates the origin and base path before clearing output.
- Toolbox module imports, worker URLs, navigation, metadata, breadcrumbs, related links, API probes, sitemap and manifest use the mounted prefix. The manifest's scope keeps an installed toolbox inside its own subtree.
- Worker routing is limited to `/akeluwatoolbox` and `/akeluwatoolbox/*`. Company routes and `/api/v1` remain owned by the company app/API.

## Hosting

Deploy the company GitHub repository (`AKELUWA-SH-Full-Stack`) to Vercel using the committed `vercel.json`. Choose the **Next.js** framework and leave Root Directory blank when this folder is the repository root. If deploying the parent AkeluwaToolBox repository instead, set Root Directory to `AKELUWA-SH-Full-Stack`. The parent standalone `vercel.json` does not build the company website.

The Vercel configuration runs `npm ci` and `npm run build:vercel`; this generates the toolbox before building native Next.js into `.next`. Leave Output Directory at its Next.js default (do not set it to `dist`). Use Node.js 22.x. `next.config.ts` maps the ten toolbox URLs to generated static HTML and preserves their trailing slashes. Assets are served from `public`; unknown toolbox paths return its HTML 404. Existing Vinext/Cloudflare scripts remain available separately.

Set `NEXT_PUBLIC_SITE_URL=https://www.akeluwasoftwarehub.com.np` in Vercel for company metadata. Set `NEXT_PUBLIC_API_URL` to the existing deployed Go API's HTTPS `/api/v1` URL: Vercel builds the frontend, not the Go/PostgreSQL service. The API's CORS configuration must allow the company origin. Optional `TOOLBOX_SITE_URL` controls toolbox canonical URLs and must be an HTTPS origin with no path. Keep development-only localhost values out of production configuration.

The toolbox is served from the same build and origin. No proxy to the previous Vercel site is required. Local Python compression is optional for standalone use and is not part of the company-domain hosted runtime.

Attach `www.akeluwasoftwarehub.com.np` to this company Vercel project and use the DNS values shown by Vercel. Commit and push the company source (including `toolbox/`, scripts, routes and `vercel.json`) to its connected GitHub branch, then redeploy. Generated `public/akeluwatoolbox/` is ignored and rebuilt automatically. Local changes do not update GitHub or the live domain.

For a native Vercel production preview, run `npm run build:vercel` then `npm run start:vercel -- --port 5186`. Point `PLAYWRIGHT_BASE_URL` at `http://127.0.0.1:5186` to verify the existing toolbox browser regressions against this runtime.

## Verification

`tests/browser/toolbox.spec.ts` covers company-to-toolbox navigation with an unavailable portfolio API, all ten deep links, same-domain assets, reload and Back, canonical URLs, mobile overflow, manifest scope, sitemap, 404 behavior, valid photo/PDF downloads and filename injection regression. It uses browser-generated fixtures and does not send them to the company API.

The company JavaScript/CSS budget remains unchanged. The toolbox has a separate budget for its PDF engines, which are downloaded only on toolbox pages; the company homepage does not import them. Rendered-HTML regressions verify the production Worker routing independently of preview middleware.

Run with the installed browser: `node node_modules/@playwright/test/cli.js test tests/browser/toolbox.spec.ts`. When another project already uses the default preview port, set `PLAYWRIGHT_BASE_URL` and `PLAYWRIGHT_WEB_SERVER_COMMAND` to a dedicated local port so the tests verify this checkout.

Verified on 9 October 2026: production build and typecheck passed; all 15 Node regressions passed. All three toolbox browser tests and the updated project-inquiry regression passed against the final production Worker preview. The other fourteen public-browser tests passed in the preceding run. Standalone PDF and SEO suites each passed ten check groups. During final verification, the production preview was used to avoid live-reload interference from rebuilding generated assets in the development server.

Vercel compatibility verified separately on 9 October 2026: `npm run build:vercel` passed native Next.js compilation, TypeScript and static generation. All three toolbox browser tests plus the project-inquiry regression passed against `next start`. The routing regression additionally checks every tool's missing-slash and `index.html` aliases, legacy photo selection and the home query without redirect loops. The Next.js 404 trace includes the generated toolbox 404 HTML for deployment. GitHub pushes, Vercel builds in the cloud, production API connectivity and live DNS have not been performed or verified from this local session.

## Security boundary

Since the toolbox now shares the company origin, filenames displayed in HTML are escaped in both standalone and embedded browser sources. A regression verifies that a crafted filename appears as literal text rather than an executable element. This fixes the confirmed filename injection from the earlier review. PDF overlay editing is still not secure redaction, and the other findings in the earlier review are not claimed to be resolved by this integration.
