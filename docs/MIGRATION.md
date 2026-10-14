# AKELUWA monorepo migration safety

The restructuring happens on `refactor/akeluwa-monorepo-2026-10`, not the live `main` branch. The original three GitHub repositories remain unchanged.

- 226 existing company files moved without modifying their content.
- The company-customized Toolbox is the canonical browser source.
- 42 PublicInfoHub files, including original image assets, are imported.
- Optional local Django PDF engine and historic tests are imported.
- New build script publishes static ToolBox and PublicInfoHub under the original URLs.

## Required before merge or DNS changes

1. Make all GitHub Actions test jobs pass.
2. Verify native Next.js build and nested routes, public images, stamp customization, downloads and real mobile browser usage.
3. Compare SEO metadata, sitemaps, robots and verification files to existing production.
4. Validate authenticated API, email delivery, PostgreSQL backup/restore and security under HTTPS.
5. Test Docker Compose on the actual Lightsail server.
6. Keep existing Vercel deployments and DNS for rollback until a successful controlled cutover.

No AWS server deployment, production database migration or DNS switch was performed by this GitHub refactor.
