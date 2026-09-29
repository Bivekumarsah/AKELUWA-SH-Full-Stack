# Production Operations

## Monitoring And Alerts

Scrape `http://api:8080/metrics` from a collector on the private Docker network. The public Caddy route returns `404` for `/metrics`.

Create alerts for the following conditions:

- `/readyz` fails twice in two minutes or the API container restarts unexpectedly.
- `akeluwa_http_errors_total` increases repeatedly over five minutes.
- Request latency rises materially above the established baseline.
- `akeluwa_rate_limit_rejections_total` spikes, which may indicate abuse or a broken client.
- PostgreSQL disk utilization exceeds 75%, backup age exceeds 25 hours, or certificate renewal fails.

Send alerts to at least two maintainers and test the route quarterly.

## Backups

Create a restricted `deploy/.env`, then run:

```sh
sh ./deploy/backup-db.sh
```

The script creates a private custom-format PostgreSQL dump and SHA-256 checksum under `deploy/backups/`, then removes local backups older than `BACKUP_RETENTION_DAYS` (14 by default). Schedule it daily with systemd or cron. Copy every successful backup to encrypted storage in another failure domain; the local Docker host is not a backup destination.

Keep at least 14 daily and 3 monthly copies. Back up `JWT_SECRET` and `MFA_ENCRYPTION_KEY` in a separate secrets manager because database recovery alone cannot decrypt MFA secrets or preserve active sessions.

## Restore Drills

Verify a dump without touching the production database:

```sh
sh ./deploy/verify-backup.sh ./deploy/backups/akeluwa-YYYYMMDDTHHMMSSZ.dump
```

The script creates a uniquely named temporary database, restores with `--exit-on-error`, verifies migration records, and removes the temporary database. Run this monthly and record the date, backup identifier, duration, and result. A backup is not considered healthy until a restore drill passes.

## Incident Response

1. Assign an incident lead, record UTC start time, and preserve API, proxy, database, and administrator audit logs.
2. Contain the issue: suspend affected accounts, revoke exposed credentials, or isolate the service. Do not delete evidence.
3. Rotate compromised secrets individually. Rotating `MFA_ENCRYPTION_KEY` requires controlled administrator MFA re-enrollment.
4. Restore from a verified backup when integrity is uncertain, then validate `/livez`, `/readyz`, authentication, customer ownership, and admin authorization.
5. Notify affected parties according to contractual and legal obligations. Document scope, timeline, decisions, and evidence.
6. Complete a blameless review within five business days and turn every corrective action into an owned, dated task.

## Release Checklist

- CI lint, build, frontend tests, Go race tests, Go vet, and the production dependency audit pass.
- Production environment validation passes with unique secrets and exact HTTPS origins.
- Database migrations are reviewed and a current verified backup exists.
- Health checks, metrics collection, alerts, and log retention are active.
- A rollback image and the previous known-good configuration remain available.
