# AKELUWA SH Full-Stack Website

AKELUWA SH is a company website and operational platform. It combines a React/TypeScript frontend with a Go REST API and PostgreSQL database. Public visitors can view services, work, downloads, and careers; customers can manage project activity; administrators can manage content and company operations.

## What This Repository Contains

| Area | Purpose | Main location |
|---|---|---|
| Public website | Marketing pages, inquiry form, downloads, careers, SEO | `app/` |
| Customer portal | Profile, inquiries, contracts, invoices | `app/account/page.tsx` |
| Authentication | Shared login for customers, administrators, and sub-administrators | `app/login/page.tsx`, `app/register/page.tsx` |
| Admin workspace | Content, inquiries, contracts, accounting, access, audit work | `app/admin/page.tsx` |
| API | Authentication, authorization, REST handlers, HTTP security | `backend/internal/httpapi/` |
| Database access | PostgreSQL queries and transaction workflows | `backend/internal/store/` |
| Database schema | Ordered PostgreSQL migrations and seed data | `backend/internal/database/migrations/` |
| Local runtime | PostgreSQL and Go API containers | `compose.yaml` |
| Production runtime | PostgreSQL, API, and Caddy HTTPS proxy | `deploy/` |

## Architecture

```text
Browser
  -> React/Vinext pages and components in app/
  -> app/lib/api.ts sends requests to /api/v1
  -> Go router and security middleware in backend/internal/httpapi/api.go
  -> authorization, validation, and handler logic
  -> PostgreSQL store in backend/internal/store/store.go
  -> PostgreSQL schema created by backend/internal/database/migrations/
```

Public pages that load publishable content use `app/lib/use-published-content.ts`. Private pages use `app/lib/use-session.ts` to confirm the signed session before loading account or administrator data.

The Go API is the source of truth for authentication, authorization, business rules, and PostgreSQL data. Frontend visibility controls improve the user experience, while API permissions enforce access securely.

## Detailed Documentation

- [Architecture](docs/ARCHITECTURE.md): runtime boundaries, request flow, security layers, and ownership rules.
- [API reference](docs/API.md): route groups, methods, session requirements, and permission model.
- [Database guide](docs/DATABASE.md): tables, relationships, migrations, and data ownership.
- [Contributing guide](docs/CONTRIBUTING.md): development workflow, testing, and the required documentation checklist.

## Roles And Access

| Role | Access |
|---|---|
| Visitor | Public website, contact inquiry, published downloads, career applications |
| Customer | Own profile, inquiries, contracts, invoices, contract signature |
| Administrator | Full admin workspace, user roles, delegated access, action reviews, audit logs |
| Sub-administrator | Only the granted View, Create, Edit, and Delete permissions for allowed work areas |

All administrators and sub-administrators complete TOTP MFA. A single sign-in form determines the destination from the verified user role: customers go to `/account`; administrators and sub-administrators go to `/admin`.

## Directory Guide

```text
app/
  page.tsx                     Public homepage
  services/, case-studies/     Public service and portfolio pages
  contact/, about/             Public company and contact pages
  careers/, downloads/         Public hiring and resource pages
  careers/apply/               Career application route
  login/, register/            Shared sign-in and customer registration
  account/                     Customer portal
  admin/                       Administrator and sub-administrator workspace
  privacy-policy/, terms/      Legal pages
  components/                  Reusable UI grouped by business feature
  lib/                         API client, session hooks, CSV helper, site data hooks
  globals.css                  Shared visual system and responsive styles

backend/
  cmd/api/main.go              API startup, configuration, database connection, migrations
  internal/auth/               Password hashing, signed sessions, MFA/TOTP crypto
  internal/config/             Environment parsing and production safety validation
  internal/httpapi/            Router, handlers, middleware, permissions, rate limits
  internal/model/              API and persistence domain types
  internal/store/              PostgreSQL queries and transactional workflows
  internal/database/           Migration runner and ordered SQL migrations

tests/
  rendered-html.test.mjs       Rendered-page and metadata regression tests
  csv.test.mjs                 CSV export tests
  browser/public.spec.ts       Playwright browser tests for layout and public flows

deploy/                        Production Docker Compose, Caddy configuration, environment example
scripts/                       Cross-platform frontend command wrappers and CI helpers
public/                        Static logo, social image, and public assets
db/ and worker/                Frontend platform support source; not the Go/PostgreSQL API data layer
```

## Frontend Ownership Map

| File or folder | Owns |
|---|---|
| `app/layout.tsx` | Document shell, global metadata, favicon setup |
| `app/globals.css` | Global visual system and responsive styles |
| `app/components/site-header.tsx` | Public navigation and customer sign-in entry point |
| `app/components/site-footer.tsx` | Footer, company details, legal links |
| `app/components/project-inquiry-form.tsx` | Public project inquiry submission |
| `app/components/published-content.tsx` | Dynamic published service and portfolio rendering |
| `app/components/public-downloads.tsx` | Public resource list and download links |
| `app/components/public-careers.tsx` | Public career opening list |
| `app/components/career-application-form.tsx` | Resume upload and career application form |
| `app/components/profile-menu.tsx` | Shared account menu, profile edits, avatar upload, sign-out |
| `app/components/contract-management.tsx` | Admin contract creation, status, and signing actions |
| `app/components/account-contracts.tsx` | Customer contract list and customer signature flow |
| `app/components/contract-document.tsx` | Printable contract document view |
| `app/components/accounting-management.tsx` | Admin invoices, payments, expenses, receipts, and ledger |
| `app/components/company-account.tsx` | Company identity and business settings |
| `app/components/sub-admin-management.tsx` | Sub-administrator accounts and permission grants |
| `app/components/action-review-management.tsx` | Full-admin review of protected destructive actions |
| `app/components/publishing-management.tsx` | Admin downloads, careers, and publishing controls |
| `app/components/signature-pad.tsx` | Signature capture used by contract workflows |
| `app/lib/api.ts` | Typed frontend API client and shared response models |
| `app/lib/use-session.ts` | Guest-only and protected-route session redirects |
| `app/lib/use-published-content.ts` | Published services and portfolio loading state |
| `app/lib/csv.ts` | CSV escaping and serialization |

## Backend Ownership Map

| File or folder | Owns |
|---|---|
| `backend/cmd/api/main.go` | Loads configuration, opens PostgreSQL, runs migrations, creates the HTTP server |
| `backend/internal/config/config.go` | Environment parsing, production safety validation, allowed origins |
| `backend/internal/auth/auth.go` | bcrypt passwords, signed sessions, TOTP generation and verification, MFA secret encryption |
| `backend/internal/httpapi/api.go` | Every HTTP route, request validation, session middleware, CORS, CSRF, headers, audit logging |
| `backend/internal/httpapi/ratelimit.go` | Per-client limits for login, registration, inquiries, and career applications |
| `backend/internal/model/model.go` | User, inquiry, contract, accounting, company, and publishing data types |
| `backend/internal/store/store.go` | SQL access, ownership checks, atomic contracts, invoices, payments, and approval workflows |
| `backend/internal/database/database.go` | Migration discovery, ordering, and execution |

When adding a database-backed feature, follow this path: add a migration, update the domain model, add store methods, add protected API handlers, add API types/client calls, then add the page or component and tests.

## Database Map

Migrations execute once, in number order. Never edit a migration that may have run in a shared or production database; add the next numbered migration instead.

| Migration | Adds or changes |
|---|---|
| `001_initial.sql` | Users, services, portfolio items, inquiries, and starter published content |
| `002_contracts.sql` | Customer and provider contract workflow |
| `003_resources_careers.sql` | Managed downloads and career openings |
| `004_career_applications.sql` | Career applications and stored resumes |
| `005_user_profiles.sql` | Profile avatar storage |
| `006_admin_security.sql` | Administrator MFA fields and append-only audit records |
| `007_company_account.sql` | Company identity, legal, contact, and business settings |
| `008_accounting.sql` | Invoices, invoice items, payments, expenses, receipts, and ledger data |
| `009_company_tagline_meaning.sql` | Public company tagline supporting text |
| `010_sub_admin_rbac.sql` | Sub-administrator role, active status, and permissions |
| `011_granular_admin_approvals.sql` | Action-level permissions and full-admin destructive-action reviews |
| `012_client_invoice_access.sql` | Customer ownership for invoice access |

## API Guide

The router is the complete API source of truth: `backend/internal/httpapi/api.go`.

| API area | Base path | Examples |
|---|---|---|
| Health | `/livez`, `/readyz`, `/healthz` | Process liveness and database readiness |
| Authentication | `/api/v1/auth` | Register, login, MFA verification, current user, logout |
| Public content | `/api/v1` | Services, portfolio, company brand, downloads, careers, inquiry submission |
| Customer account | `/api/v1/account` | Profile, avatar, inquiries, contracts, invoices, contract signing |
| Administration | `/api/v1/admin` | Stats, content, inquiries, contracts, users, accounts, access, reviews, audit logs |

Write requests that use a session cookie require an allowed browser `Origin`. Authentication and public submissions are rate limited. Administrator write requests are audited; selected destructive sub-administrator actions become review requests until a full administrator approves them.

## Local Development

### Requirements

- Node.js 22.13 or newer
- Docker Desktop with Docker Compose
- Go only when running backend tests outside Docker

### Start the API and database

```bash
docker compose up --build
```

This starts PostgreSQL on port `5432` and the Go API on `http://localhost:8080`. The API applies migrations automatically. Local development administrator credentials are defined in `compose.yaml`; change them before sharing the environment.

### Start the frontend

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open the URL printed by the frontend dev server, normally `http://localhost:5173`.

`NEXT_PUBLIC_API_URL` must point at the API base path, normally `http://localhost:8080/api/v1`. `NEXT_PUBLIC_SITE_URL` must match the frontend browser origin.

## Environment Files

| File | Used by | Purpose |
|---|---|---|
| `.env.example` | Frontend build | Public API URL and public site URL |
| `.env.local` | Local frontend only | Your local copy of frontend values; do not commit it |
| `backend/.env.example` | Go API outside Docker | Database, session, MFA, cookie, and CORS configuration |
| `deploy/.env.example` | Production Docker Compose | Production domains, database credentials, cookies, API secrets |
| `compose.yaml` | Local Docker API | Local-only development values and initial admin account |

Production requires independent strong secrets for `JWT_SECRET`, `MFA_ENCRYPTION_KEY`, PostgreSQL, and the initial administrator. `MFA_ENCRYPTION_KEY` must be retained because replacing it makes existing encrypted MFA secrets unreadable.

## Testing And Verification

| Command | Runs |
|---|---|
| `npm run typecheck` | TypeScript validation |
| `npm run lint` | ESLint checks |
| `npm test` | TypeScript, production build, rendered-page tests, CSV tests |
| `npm run test:browser` | Playwright public navigation, recovery, auth layout, and responsive checks |
| `npm run test:docs` | Documentation structure and source-reference validation |
| `go test ./...` from `backend/` | Go unit tests and integration tests when configured |

PostgreSQL-backed Go tests require an isolated `TEST_DATABASE_URL`. They create temporary records and must never target a production database.

For browser tests, start the frontend and API first. The suite uses `http://localhost:5173` by default. Set `PLAYWRIGHT_BASE_URL` for another frontend URL. The default browser channel is Microsoft Edge; set `PLAYWRIGHT_CHANNEL=chromium` after installing Playwright Chromium to use Chromium.

## Common Change Workflows

### Add a public page

1. Create the route under `app/`.
2. Reuse `site-header.tsx`, `site-footer.tsx`, and `inner-page.tsx` where appropriate.
3. Add route metadata and sitemap coverage when the page is public.
4. Add rendered-page or browser coverage for important interactions.

### Add an admin feature

1. Add a migration and store methods when persistence is needed.
2. Define a model in `backend/internal/model/`.
3. Add an API route in `backend/internal/httpapi/api.go` with the exact required permission.
4. Add typed client support in `app/lib/api.ts`.
5. Add the admin component and wire it into `app/admin/page.tsx`.
6. Add authorization and workflow tests.

### Change a customer feature

1. Update the account API handler and store ownership query.
2. Update `app/lib/api.ts` models and calls.
3. Update `app/account/page.tsx` or `app/components/account-contracts.tsx`.
4. Test that a customer can only read or alter their own records.

### Add a migration

1. Create `backend/internal/database/migrations/NNN_feature_name.sql` with the next sequence number.
2. Make the SQL safe for an existing database using `IF NOT EXISTS` or compatible guards where appropriate.
3. Add store, API, and frontend changes in the same implementation.
4. Test against an isolated PostgreSQL database.

## Production Deployment

1. Provision an Ubuntu server with Docker Engine and Docker Compose.
2. Point the API domain to the server and allow only TCP ports `80` and `443` publicly.
3. Copy `deploy/.env.example` to `deploy/.env` and replace every example value.
4. From `deploy/`, run:

```bash
docker compose -f compose.prod.yaml up -d --build
```

Caddy in `deploy/Caddyfile` terminates HTTPS and proxies to the private Go API. PostgreSQL is not exposed publicly. Configure the frontend with `NEXT_PUBLIC_API_URL=https://api.example.com/api/v1` and the correct `NEXT_PUBLIC_SITE_URL` before its production build.

When frontend and API use different top-level domains, set `COOKIE_SAME_SITE=none`, keep `COOKIE_SECURE=true`, and allow the exact frontend origin through `CORS_ORIGINS`.

## Operational Notes

- `/livez` confirms that the Go process is running; `/readyz` confirms database connectivity.
- Use `IMPROVEMENTS.md` for completed engineering work, remaining risks, and the security/testing history.
- Keep `.env.local`, `backend/.env`, and `deploy/.env` private.
- Do not edit generated build output, Docker database volumes, or completed production migrations manually.
