# Neon development backend deployment (isolated)

This guide prepares the **existing** Go backend in `backend/` to connect to the Neon **development** branch only. Do not use the production database URL. This repository's `main` branch and live Vercel site are not changed by the work in this branch.

## Verified Neon target

- Project: `AKELUWA` (`royal-paper-93377457`)
- Branch: `development-company-schema` (`br-little-wind-b7ojem3o`)
- Database: `neondb`
- 18 migrations and 20 tables are already present.

## Secure connection

In Neon, select project **AKELUWA** > branch **development-company-schema** > **Connect**. Copy that branch's PostgreSQL URL (not production). Configure the backend hosting provider's private environment variable `DATABASE_URL` using the URL with **`sslmode=require`** (or the stronger TLS verification mode supplied by Neon). Never put this URL in source files, `.env.example`, public `NEXT_PUBLIC_*` variables, issues, or build output. Rotate any credentials exposed accidentally.

The existing Go backend uses `pgxpool`, reads `DATABASE_URL`, pings PostgreSQL at startup, and runs the embedded migrations. Therefore no new database driver or ORM is required. Production-ready runtime settings are more restrictive; development settings below are **not** suitable for a public, real-client production deployment.

## Isolated development deployment (suggested: Render Web Service)

1. Create a **new** Web Service from this repository, selecting the `development/neon-go-backend` branch. Do **not** attach it to an existing live service.
2. Select **Docker**, root directory `backend`, Dockerfile `./Dockerfile`. The Dockerfile already compiles the Go API and exposes port 8080. Choose a suitable instance plan after reviewing current provider pricing.
3. Set private service environment variables (no real secret values belong in Git):
   - `DATABASE_URL`: development-only Neon PostgreSQL URL, TLS enabled.
   - `APP_ENV=development` (the current Go configuration deliberately requires SMTP and stronger controls when set to production).
   - `HTTP_ADDRESS=:8080`
   - `JWT_SECRET`: unique, cryptographically random, at least 32 characters.
   - `MFA_ENCRYPTION_KEY`: a **different** random key, at least 32 characters.
   - `JWT_ISSUER=akeluwa-api`
   - `COOKIE_SECURE=true`, `COOKIE_SAME_SITE=none` only for cross-site HTTPS preview use, `COOKIE_DOMAIN` empty.
   - `CORS_ORIGINS` and `FRONTEND_URL`: the exact HTTPS **preview** frontend origin(s), never `*`.
   - `TRUST_PROXY_HEADERS=true` only behind a known trusted proxy.
   - `ADMIN_EMAIL` and `ADMIN_PASSWORD`: leave unset until intentionally provisioning a test admin account.
   - `SMTP_*`: configure a sandbox mail provider before testing verification, password reset, notifications, or user onboarding. The fallback development mailer is not a real delivery service.
4. Set HTTP health path to `/readyz`. This checks database availability; `/livez` checks process liveness.
5. Keep automatic deployment limited to this GitHub development branch; disable production deploy hooks.
6. Verify `GET /livez`, `GET /readyz`, `GET /api/v1/services`, `GET /api/v1/portfolio` before any frontend changes. Never submit real customer data during development testing.

## Important deployment caveats

- The backend **automatically runs migrations at process startup**. The 18 current migrations are already recorded in the development branch, so they should be skipped there. Only use this service with the development Neon connection; migration files added later will execute automatically. Review migrations before every deploy.
- Current session authentication uses HTTP cookies. Cross-site frontend/API domains need HTTPS, explicit CORS, `credentials: include`, secure cookies, and a supported cross-site-cookie strategy. Browser third-party-cookie restrictions can still block this configuration. For a durable rollout, prefer a same-origin API reverse proxy on the company website after separate preview testing.
- Keep `NEXT_PUBLIC_API_URL` set **only on a Vercel preview environment** when ready, pointing to `https://<your-preview-backend-host>/api/v1`; do not change the Production environment variables.
- The repository already has GitHub Actions tests for backend, frontend, and full-stack. These use isolated local PostgreSQL; they must **never** run tests that delete/reset data against the Neon development database or any production branch.
- GitHub is not a secret manager. Configure database credentials in the hosting provider's encrypted environment settings, separately from GitHub.
- Toolbox and PublicInfoHub routing stay in the Next.js site and should remain unaffected by backend-only development work.

## Approval gates

1. Review development branch and CI.
2. Create a **new preview backend** and verify its health/API manually.
3. Point a **Vercel preview only** at that preview backend and run end-to-end tests.
4. Obtain explicit approval **before** changing live Vercel, production Neon, production DNS, or merging to `main`.
