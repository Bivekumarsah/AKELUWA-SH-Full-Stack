# Architecture

The main Node.js Next.js service runs the company application. The browser ToolBox and static PublicInfoHub assets are built into the same company public directory, with their existing URLs. The Go API and PostgreSQL run on a private network; the optional Django PDF engine is local-only.

```text
apps/company          Next.js company homepage, portal, admin
apps/toolbox          Single source of browser PDF/image/stamp tools
apps/publicinfohub    Static directory, province/district tools, utilities
services/api          Go handlers and PostgreSQL migrations
services/pdf-engine   Optional local Django/PyMuPDF engine
infrastructure        AWS Lightsail, reverse proxy, local Compose
docs                  Architecture and original company/tool guides
```

Public paths remain `/`, `/akeluwatoolbox/`, and `/publicinfohub/`. `/api/v1/*` is proxied to Go. The authoritative company-customized ToolBox files remain under `apps/toolbox` and are shared through a symlink, not duplicated. PublicInfoHub code is copied at build time from its own app directory into the frontend static subtree.

Old standalone repositories remain unchanged for historical review. Lightsail code is staging-only, requiring runtime/CI verification and database backup before any DNS change.
