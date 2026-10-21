#!/usr/bin/env sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
backup_dir=${BACKUP_DIR:-"$script_dir/backups"}
retention_days=${BACKUP_RETENTION_DAYS:-14}
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
target="$backup_dir/akeluwa-$timestamp.dump"
temporary="$target.tmp"

umask 077
mkdir -p "$backup_dir"
trap 'rm -f "$temporary"' EXIT HUP INT TERM

docker compose --env-file "$script_dir/.env" -f "$script_dir/compose.prod.yaml" exec -T postgres \
  sh -c 'exec pg_dump --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --format=custom --compress=9 --no-owner --no-privileges' \
  > "$temporary"

test -s "$temporary"
mv "$temporary" "$target"
sha256sum "$target" > "$target.sha256"
find "$backup_dir" -type f \( -name 'akeluwa-*.dump' -o -name 'akeluwa-*.dump.sha256' \) -mtime "+$retention_days" -delete
printf 'Backup created: %s\n' "$target"
