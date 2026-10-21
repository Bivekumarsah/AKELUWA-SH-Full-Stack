# AKELUWA production release readiness — mandatory evidence, not a score

Scope: `refactor/akeluwa-monorepo-2026-10`. Do not change DNS, deploy to production,
or merge based only on an engineering score. The current monorepo source is staging
work. Sign-off requires test evidence from the *exact SHA* intended for release.

## Automated prerequisites
- [ ] The five GitHub Actions jobs all passed on the release SHA (frontend/browser,
  PublicInfoHub, Go with race checks and PostgreSQL, full-stack, local Django).
- [ ] Production dependency audit and Docker Compose validation passed.
- [ ] The Go `govulncheck` and Python `pip-audit` results on the release candidate have no unresolved actionable findings.
- [ ] Run the manual `Monorepo quality and security` workflow with `workflow_dispatch`, or open a reviewed pull request; ensure **both Docker release images build** successfully using the same production Dockerfiles.
- [ ] Code review accepted; branch protection and release rollback tag established.

## Real staging verification
- [ ] Deploy the exact SHA to a valid **HTTPS staging hostname**, not HTTP by IP.
- [ ] `GET /`, `/akeluwatoolbox/`, nested stamp and PDF URLs,
  `/publicinfohub/`, `/publicinfohub/offices/`, and utility pages work.
- [ ] Check sitemaps, canonical tags, robots/noindex on staging, and all static assets.
- [ ] Validate touch behavior on actual low-memory Android and iPhone devices;
  keyboard and screen reader navigation, no horizontal overflow or lost input.
- [ ] Validate PDF conversion, image compression, stamp customization and downloaded
  artifacts with real sample documents; test malicious and corrupt inputs safely.
- [ ] Verify account registration, email verification, password reset, MFA,
  session termination, client-owned records, sub-admin approval enforcement.
- [ ] Exercise inquiries, contracts, signatures, invoices, notifications and
  persistent database changes through the real HTTPS API.
- [ ] Confirm **outbound SMTP** deliveries and retry queue handling using test accounts.
- [ ] Run passive security checks (headers, cookies, CORS, CSP), permission boundary
  tests, dependency and container scans; remediate findings.
- [ ] Measure field or lab Core Web Vitals (LCP, INP, CLS) on desktop and mobile.

## Backup and operations
- [ ] Run `infrastructure/lightsail/backup-db.sh` and verify its SHA-256 sidecar.
- [ ] Restore with `verify-backup.sh` into the scratch DB on staging; verify data.
- [ ] Set up **daily scheduling** plus reliable failure alerts: the scripts alone
  DO NOT constitute automated backups.
- [ ] Upload encrypted copies off-instance with an independent retention policy,
  and test recovery from that independent copy.
- [ ] Verify storage headroom, OOM behavior, TLS renewals, metrics/alerts and log rotation.
- [ ] Prepare and rehearse rollback to Vercel and the previous database schema or snapshot.

## Sign-off record
Release SHA: ______

Staging URL / verified at (UTC): ______

Backup/restore evidence and off-site storage: ______

Browser and security test evidence: ______

Rollback owner and measured recovery time: ______

Approval from responsible operator: ______

**Production gate: BLOCKED until every applicable item has real evidence.**
