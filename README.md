# AKELUWA Softwarehub monorepo

The existing company website, ToolBox, and PublicInfoHub now live in one source repository. This restructuring is on a development branch; existing live deployments and old repositories have not been removed.

## Structure

- `apps/company/` — existing Next.js 16, React 19, TypeScript website, company portals, browser tests, and frontend build.
- `apps/toolbox/` — one authoritative Toolbox with all the company-specific PDF, image, stamp, mobile-preview, accessibility and SEO features.
- `apps/publicinfohub/` — all original PublicInfoHub HTML, CSS, JS, image assets, government directory content and utility pages.
- `services/api/` — existing Go API and PostgreSQL migrations.
- `services/pdf-engine/` — optional localhost-only Django/PyMuPDF service.
- `infrastructure/lightsail/` — Docker Compose, HTTPS reverse proxy, and Lightsail instructions.
- `infrastructure/local/` — local development Compose.
- `docs/company/` and `docs/toolbox/` — original project documentation.

The company reads ToolBox through a tracked symlink (`apps/company/toolbox`) rather than keeping a second copy. The company build generates public content for both Toolbox and PublicInfoHub.

## Public URLs (unchanged)

- https://www.akeluwasoftwarehub.com.np/
- https://www.akeluwasoftwarehub.com.np/akeluwatoolbox/
- https://www.akeluwasoftwarehub.com.np/publicinfohub/

## Local build

Install Node.js 22+, then from repository root:

```sh
npm ci --prefix apps/company
npm --prefix apps/company run build:vercel
npm --prefix apps/company test
(cd apps/publicinfohub && node --test tests/*.test.mjs)
(cd services/api && go test ./...)
```

See [architecture](docs/ARCHITECTURE.md) and [Lightsail staging](infrastructure/lightsail/README.md) for runtime responsibilities and deployment instructions. This branch has not been merged into production or deployed to AWS.
