# AKELUWA SH — Full-Stack Website

AKELUWA SH combines the existing React/TypeScript marketing website with a Go REST API and PostgreSQL database.

## Included features

- Public services and portfolio content loaded from PostgreSQL
- Project/contact inquiry form
- User registration, login, logout, and private inquiry history
- Admin dashboard with summary metrics
- Admin management for inquiries, services, portfolio items, and user roles
- Project contract workflow with locked terms, dual electronic acceptance, content fingerprints, and printable/PDF records
- Admin-managed downloads and career openings that publish automatically to the public website
- Private career application workflow with applicant details, resume uploads, candidate statuses, and administrator review
- HttpOnly signed session cookies, bcrypt password hashing, origin restrictions, and role authorization
- Automatic PostgreSQL migrations and initial content
- Docker configurations for local development and an AWS EC2/VPS deployment

## Project structure

```text
app/                    React/TypeScript frontend pages and global styles
app/components/         Reusable site and form components
backend/cmd/api/        Go API entry point
backend/internal/       Configuration, authentication, database, API, and storage
backend/internal/database/migrations/
                        PostgreSQL schema and starter content
deploy/                 Production Docker Compose and Caddy HTTPS proxy
compose.yaml            Local PostgreSQL and Go API
```

## Local setup

Requirements:

- Node.js 22.13 or newer
- Docker Desktop with Docker Compose

Start PostgreSQL and the Go API:

```bash
docker compose up --build
```

Copy the frontend environment example:

```bash
cp .env.example .env.local
```

Set `NEXT_PUBLIC_SITE_URL` to the browser origin used for the frontend. Use `http://localhost:5173` locally and the public HTTPS website URL in production; this keeps favicon and social metadata URLs correct.

Install and start the frontend:

```bash
npm install
npm run dev
```

The local `dev`, `build`, `lint`, and `db:generate` scripts work from Windows PowerShell as well as macOS and Linux. Run all frontend checks with `npm test`, and run backend tests from `backend/` with `go test ./...`.

Open the local URL printed by Vite. The starter administrator is configured in `compose.yaml`; change those local-only credentials whenever the project is shared.

## Production deployment on AWS EC2 or a VPS

1. Create an Ubuntu server with Docker Engine and the Docker Compose plugin.
2. Point an API subdomain, such as `api.example.com`, to the server’s public IP.
3. Allow inbound TCP ports 80 and 443. Do not expose PostgreSQL port 5432 publicly.
4. Copy the repository to the server.
5. Copy `deploy/.env.example` to `deploy/.env` and replace every example secret and domain.
6. From the `deploy` directory, run:

```bash
docker compose -f compose.prod.yaml up -d --build
```

Caddy automatically obtains and renews HTTPS certificates. PostgreSQL and the Go API stay on a private Docker network.

Set the frontend build variable to the public API address:

```text
NEXT_PUBLIC_API_URL=https://api.example.com/api/v1
```

If the frontend and API use different top-level domains, configure `COOKIE_SAME_SITE=none`, keep `COOKIE_SECURE=true`, and include the exact frontend origin in `CORS_ORIGINS`. Using `www.example.com` and `api.example.com` is preferred because both remain under the same site.

## Production security checklist

- Generate independent, random PostgreSQL, JWT, and administrator passwords.
- Keep `APP_ENV=production`; startup rejects insecure cookies, non-HTTPS origins, and placeholder secrets in this mode.
- Keep `.env` files off Git and restrict their server permissions.
- Use a dedicated API subdomain and HTTPS.
- Restrict SSH to trusted IPs and use key-based access.
- Back up the PostgreSQL volume or use Amazon RDS for managed backups.
- Remove `ADMIN_EMAIL` and `ADMIN_PASSWORD` together after the first administrator has been created, or rotate the password immediately.
- Review registered administrators regularly in the dashboard.

## API summary

Public routes:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/services`
- `GET /api/v1/portfolio`
- `GET /api/v1/downloads`
- `GET /api/v1/downloads/{id}/file`
- `GET /api/v1/careers`
- `POST /api/v1/careers/{id}/applications`
- `POST /api/v1/inquiries`

Authenticated user routes:

- `GET /api/v1/auth/me`
- `GET /api/v1/account/inquiries`
- `GET /api/v1/account/contracts`
- `POST /api/v1/account/contracts/{id}/sign`

Administrator routes are under `/api/v1/admin` and require an administrator session.
