# AKELUWA monorepo — AWS Lightsail deployment (pre-production)

This is **staging configuration**, not an assertion that a server is deployed.
All three sites are now maintained in one repository. Current production DNS,
Vercel deployments and original GitHub repositories must remain untouched until
complete functional testing and a controlled cutover.

## Source structure
- `apps/company`: native Next.js frontend, administration and integrated ToolBox routes
- `apps/toolbox`: **single** source of all PDF/image/digital-stamp browser tools
- `apps/publicinfohub`: fully imported static directory and citizen utilities
- `services/api`: Go API, PostgreSQL migrations
- `services/pdf-engine`: optional LOCAL-ONLY Django PDF compression; not a public service
- `infrastructure/lightsail`: Docker Compose, Caddy, runtime environment template

## Before provisioning
Review live AWS credits, spending, region, IPv4 plan, and credit expiration in AWS
Billing. Use a 4-GB instance as an initial target for Next.js + Go + PostgreSQL
and monitor actual workload. Allocate a Lightsail static IP; restrict SSH to your
IP, open HTTP 80 and HTTPS 443, and set billing alarms. Maintain off-instance,
encrypted PostgreSQL backups and test restoration. Keep Vercel for rollback.

## Checkout on the Ubuntu instance

```bash
sudo apt-get update
# Install supported Docker Engine and Docker Compose plugin via Docker's official instructions.
sudo mkdir -p /opt/akeluwa
sudo chown "$USER":"$USER" /opt/akeluwa
cd /opt/akeluwa
git clone https://github.com/Bivekumarsah/AKELUWA-SH-Full-Stack.git
cd AKELUWA-SH-Full-Stack
git switch refactor/akeluwa-monorepo-2026-10
sudo mkdir -p /opt/akeluwa/publicinfohub-publish
sudo chown "$USER":"$USER" /opt/akeluwa/publicinfohub-publish
rsync -a --delete --exclude='.git/' --exclude='.github/' --exclude='tests/' \
  --exclude='scripts/' --exclude='*.md' --exclude='vercel.json' \
  apps/publicinfohub/ /opt/akeluwa/publicinfohub-publish/
cd infrastructure/lightsail
cp env.sample .env
chmod 600 .env
# Edit private .env locally and set unique strong secrets + working SMTP.
```

Do not commit or share `.env`, API keys, SMTP passwords or database credentials.
If migrating existing production PostgreSQL data, use verified backups and preserve
the correct application secrets. Starting with an empty database is not a data migration.

## HTTP-only public testing (no DNS changes)

```bash
cd /opt/akeluwa/AKELUWA-SH-Full-Stack/infrastructure/lightsail
docker compose config --quiet
docker compose build frontend
docker compose build api
docker compose up -d
docker compose ps
docker compose logs --tail=100 frontend api postgres caddy
```

The sample environment uses `Caddyfile.http-test`: HTTP access by server IP is
**only for public read-only smoke checks**. API, accounts, logins and forms are
blocked during staging. Do not submit personal data over HTTP. Check:
`/`, `/akeluwatoolbox/`, `/akeluwatoolbox/digital-stamp-maker/`,
`/akeluwatoolbox/extra-tools/`, `/publicinfohub/`,
`/publicinfohub/offices/` and `/publicinfohub/utilities/`.

Before cutover, validate production HTTPS, all mobile tools, SEO/metadata,
nested assets, actual PDF/image edits, authentication, secure cookies,
permissions, real SMTP delivery, persisted data, DB restoration and backups.
A staging hostname with a valid TLS certificate is preferable for account
and sensitive integration tests.

Only after tests and backup approval: update the DNS apex + www records to
the Lightsail static IPv4, change the private CADDYFILE_PATH to `./Caddyfile`,
and run `docker compose up -d --force-recreate caddy`.
Verify TLS, email, health, canonical URLs, redirects, Search Console/Bing
verification, sitemap and robots. Keep the previous Vercel route available
until rollout monitoring is stable.

## Deployments and rollback
- Pull reviewed commits on the monorepo branch, rerun the PublicInfoHub rsync
  publication step, and rebuild/restart only changed containers.
- Never overwrite a running production PostgreSQL volume with a blank one.
- Record release SHAs; keep a rollback image and database-backup restore drill.
- For production backups, adapt the existing verified PostgreSQL scripts in
  `infrastructure/legacy-api-stack/` to this compose location **before**
  claiming automated backup coverage.
- The optional Django/PyMuPDF engine remains localhost-only and is not part of
  the default Docker stack; browser PDF compression continues to work without it.
