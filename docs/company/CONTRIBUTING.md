# Contributing Guide

## Before You Start

1. Read `README.md` for setup and ownership maps.
2. Start PostgreSQL and the API with `docker compose up --build`.
3. Copy `.env.example` to `.env.local`, install dependencies, then run `npm run dev`.
4. Keep local secrets in `.env.local`, `backend/.env`, or `deploy/.env`; never commit them.

## Development Standards

- Keep UI work in the route or reusable component that owns it.
- Use `app/lib/api.ts` for frontend API requests and shared API types.
- Enforce business authorization in Go, not only in the frontend.
- Use PostgreSQL migrations for persistent schema changes.
- Prefer focused tests around changed behavior.
- Preserve existing user changes in a dirty worktree; do not reset unrelated files.

## Required Checks

Run the checks that match your change before requesting review:

```bash
npm run typecheck
npm run lint
npm test
npm run test:browser
```

For Go changes:

```bash
cd backend
go test ./...
```

Set an isolated `TEST_DATABASE_URL` for PostgreSQL-backed Go integration tests. Never run those tests against production.

## Change Checklist

Use this checklist for every feature, bug fix, or security change.

| Change | Required follow-up |
|---|---|
| Public route or page | Update `README.md` directory/feature map and add route coverage where useful |
| Component ownership changes | Update the Frontend Ownership Map in `README.md` |
| API endpoint | Update `docs/API.md`, client types, authorization, and tests |
| Table, column, or constraint | Add migration and update `docs/DATABASE.md` |
| New environment variable | Update the correct `.env.example`, `README.md`, and production validation if applicable |
| New role or permission | Update `README.md`, `docs/API.md`, backend enforcement, and authorization tests |
| Security behavior | Update `IMPROVEMENTS.md`, API documentation, and tests |
| New deployment dependency | Update `README.md` and `deploy/` documentation |
| User-visible responsive behavior | Add or update Playwright coverage when practical |

## Pull Request Description

Every change description should state:

1. The user or operational problem solved.
2. The affected routes, API endpoints, and database migrations.
3. The role and authorization implications.
4. Tests run and any tests intentionally not run.
5. Documentation updated, including the exact files.

## Definition Of Done

A change is complete when the implementation, validation, authorization, tests, and relevant documentation agree. Update the documentation in the same change as the code so it does not become a historical guess.
