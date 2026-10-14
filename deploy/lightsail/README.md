# AKELUWA on one AWS Lightsail Ubuntu host — staging preparation

**Status: untested deployment preparation; do not merge to main or switch DNS until validated.**
This deploys the existing company + its integrated ToolBox through native Next.js,
Go API + PostgreSQL in private Docker containers, and the existing standalone
PublicInfoHub as static files. The standalone Django PDF reducer is intentionally
not run: current hosted ToolBox browser code deliberately uses browser-only compression.
The three GitHub repositories remain independent.

## Before starting
- Confirm AWS Lightsail credit eligibility and expiration in the **actual AWS account**.
- Start with **4 GB Linux / IPv4** for these containers; monitor RAM, CPU and disk.
- Enable a spend/budget alert and backup plan, choose your region, attach a Lightsail
  static IPv4. Lock SSH (22) down to the administrator's IP; open only 80/443 publicly.
- Keep Vercel and all existing domain/DNS records unchanged.
- Preserve production PostgreSQL data and credentials before any cutover. An empty
  Docker volume is **not** a migration of production records.
- Production Go configuration requires real SMTP details, strong unique JWT and MFA
  secrets. Generating new JWT/MFA keys invalidates existing sessions/MFA encryption
  if migrating an existing populated database: preserve keys securely as needed.

## Checkout on Ubuntu

```sh
sudo apt-get update
# Install supported Docker Engine and Docker Compose plugin from Docker's official repository.
sudo mkdir -p /opt/akeluwa
cd /opt/akeluwa
git clone https://github.com/Bivekumarsah/AKELUWA-SH-Full-Stack.git
git clone https://github.com/Bivekumarsah/AKELUWA-PublicInfoHub.git
cd AKELUWA-SH-Full-Stack
git fetch origin deployment/lightsail-staging-2026-10
git switch deployment/lightsail-staging-2026-10
mkdir -p /opt/akeluwa/publicinfohub-publish
# Publish only static files. DO NOT serve a Git checkout's .git, tests, or scripts.
rsync -a --delete \
  --exclude='.git/' --exclude='.github/' --exclude='tests/' \
  --exclude='scripts/' --exclude='*.md' --exclude='vercel.json' \
  /opt/akeluwa/AKELUWA-PublicInfoHub/ /opt/akeluwa/publicinfohub-publish/
test -f /opt/akeluwa/publicinfohub-publish/index.html
cd deploy/lightsail
cp env.sample .env
chmod 600 .env
# Edit .env locally with long unique secrets and working SMTP configuration.
```

Never commit or paste .env credentials into a GitHub issue, PR, or chat.

## Build and stage, WITHOUT touching production DNS

```sh
cd /opt/akeluwa/AKELUWA-SH-Full-Stack/deploy/lightsail
docker compose config --quiet
# Building serially reduces peak resource contention on a small Lightsail host.
docker compose build frontend
docker compose build api
docker compose up -d
docker compose ps
docker compose logs --tail=80 frontend api caddy postgres
```

Caddy initially uses Caddyfile.http-test. Browse **only public read-only pages**:
`http://YOUR_LIGHTSAIL_IP/`, `/akeluwatoolbox/`,
`/akeluwatoolbox/extra-tools/`, `/publicinfohub/`,
`/publicinfohub/offices/` and `/publicinfohub/utilities/`.
Authentication and API paths are intentionally blocked in HTTP-only staging.
Test browser PDF/photo/stamp tools on a trusted staging environment and mobile
browsers before enabling production traffic.

## Cutover after public checks AND secure HTTPS staging tests
1. Make a verified backup of existing PostgreSQL data, if any, and restore it
   to the Lightsail database. Do not overwrite a live database blindly.
2. Verify SMTP, user accounts, Go API, cookie sessions, permissions, form submissions,
   actual PDF/photo/stamp edits, responsive navigation, and SEO/canonical links.
3. Arrange a DNS cutover window. Change **only after** the server and recovery plan
   are ready; point the apex and www records to the Lightsail static IPv4.
4. Change `CADDYFILE_PATH=./Caddyfile` in this folder's private .env,
   then run `docker compose up -d --force-recreate caddy`.
   Caddy obtains a public TLS certificate once DNS is correctly resolved and ports
   80 and 443 are reachable.
5. Recheck HTTPS (www and apex), nested routes, cache headers, robots.txt,
   /sitemap.xml, /publicinfohub/sitemap.xml, missing URLs (404), API,
   and Search Console/Bing verification files.
6. Keep Vercel as a rollback option until error rates, logs, and performance
   are stable. Restore previous DNS if major cutover checks fail.

## Operations and safety
- PostgreSQL is only in Docker's private network. No database or backend port
  is published on the host.
- Back up the database OFF the instance, with encryption and regular restore drills.
  See ../backup-db.sh and ../verify-backup.sh. Lightsail snapshots are additionally
  charged; instance snapshots alone aren't a complete point-in-time DB strategy.
- Review billing, CPU/RAM and instance status daily during the first week.
- For new PublicInfoHub changes, git pull that repository then rerun the
  rsync publication step; no second web server is required.
- For ToolBox changes, follow existing safe synchronization into company/toolbox
  and rebuild the frontend; do not blindly overwrite company stamp/SEO/routes.
- For application updates, use a reviewed commit/CI workflow, rebuild the
  changed service, verify health, and retain a rollback deployment.
- Do not use plain HTTP to test sign-in, submissions or client information.
- Ensure production SMTP service and real database migration are completed;
  neither can be inferred from GitHub source alone.
