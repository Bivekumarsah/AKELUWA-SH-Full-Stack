# Architecture

## System Boundaries

```text
Browser
  -> React/Vinext UI in app/
  -> app/lib/api.ts
  -> Go HTTP API on /api/v1
  -> PostgreSQL store
  -> PostgreSQL database
```

The frontend and API are separate deployable applications. The browser receives public or private UI from the frontend, then calls the Go API. The API owns user identity, permissions, data validation, workflows, and database persistence.

## Frontend

`app/` is route-oriented. A folder with `page.tsx` represents a route. Shared UI belongs in `app/components/`; browser data access and reusable hooks belong in `app/lib/`.

| Boundary | Responsibility |
|---|---|
| Public routes | Display published services, portfolio, downloads, careers, legal pages, and contact forms |
| `app/login/`, `app/register/` | Shared sign-in and customer registration; API assigns the signed-in destination from role |
| `app/account/` | Customer-only profile, inquiries, contracts, invoices, and contract signing |
| `app/admin/` | Administrator and sub-administrator workspace; UI hides unavailable tabs from delegated users |
| `app/lib/api.ts` | Typed request wrapper, API models, cookie-based requests, and readable API errors |
| `app/lib/use-session.ts` | Redirects guest-only, customer, and administrator routes based on `/auth/me` |

The frontend must not be trusted to protect a record. A hidden button or absent page tab is presentation only. The API repeats authorization before every private operation.

## API

`backend/cmd/api/main.go` constructs the application in this order:

1. Load and validate environment configuration.
2. Create the PostgreSQL connection pool.
3. Run SQL migrations in sequence.
4. Create the session and MFA services.
5. Create `httpapi.API` and serve its router.

`backend/internal/httpapi/api.go` is the HTTP boundary. It registers routes, decodes input, invokes the store, returns JSON, and applies middleware for CORS, CSRF protection, security headers, request logging, audit logs, and panic recovery.

## Authentication And Authorization

Sessions are signed HttpOnly cookies. Passwords use bcrypt. Administrators and sub-administrators require TOTP MFA after password verification.

| Request type | Protection |
|---|---|
| Public reads | No session required |
| Public writes | Validation and endpoint rate limit |
| Customer account route | Valid signed session and ownership query |
| Admin read | Admin MFA session and exact view permission |
| Admin write | Admin MFA session, exact action permission, CSRF/origin check, audit record |
| Protected sub-admin delete or void | Stored review request; a full administrator must approve it |

Role decisions are loaded from PostgreSQL during protected requests. This means an account suspension, permission change, or role demotion takes effect without relying on old frontend state.

## Persistence Layer

`backend/internal/store/store.go` is the persistence boundary. It contains PostgreSQL queries and transaction functions. HTTP handlers must call store methods rather than write SQL directly.

Transactions protect operations that must remain consistent, including contract acceptance, invoice calculation, payment posting, voids, and review approvals. The database migration directory is the schema source of truth.

## Deployment

Local development uses `compose.yaml` for PostgreSQL and the Go API. The frontend runs separately through `npm run dev`.

```text
Internet -> Caddy (HTTPS) -> Go API -> PostgreSQL
```

Caddy is the only public production container. The API and database remain on the private Docker network. The browser frontend must be built with the public API URL.

## Ownership Rules

- Put reusable visual or business UI in `app/components/`.
- Put frontend API types and calls in `app/lib/api.ts`.
- Put API routes and HTTP middleware in `backend/internal/httpapi/`.
- Put models shared by handlers and storage in `backend/internal/model/`.
- Put SQL access and transactional business persistence in `backend/internal/store/`.
- Add a new SQL file under `backend/internal/database/migrations/` for every persisted schema change.
- Add focused tests in the same layer where the behavior is enforced.
