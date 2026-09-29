#!/usr/bin/env sh
set -eu

if [ "$#" -ne 1 ] || [ ! -f "$1" ]; then
  printf 'Usage: %s /path/to/akeluwa-backup.dump\n' "$0" >&2
  exit 2
fi

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
backup_file=$1
restore_db="akeluwa_restore_check_$(date -u +%Y%m%d%H%M%S)"

cleanup() {
  docker compose --env-file "$script_dir/.env" -f "$script_dir/compose.prod.yaml" exec -T -e RESTORE_DB="$restore_db" postgres \
    sh -c 'dropdb --username "$POSTGRES_USER" --if-exists --force "$RESTORE_DB"' >/dev/null 2>&1 || true
}
trap cleanup EXIT HUP INT TERM

docker compose --env-file "$script_dir/.env" -f "$script_dir/compose.prod.yaml" exec -T -e RESTORE_DB="$restore_db" postgres \
  sh -c 'createdb --username "$POSTGRES_USER" "$RESTORE_DB"'
docker compose --env-file "$script_dir/.env" -f "$script_dir/compose.prod.yaml" exec -T -e RESTORE_DB="$restore_db" postgres \
  sh -c 'pg_restore --username "$POSTGRES_USER" --dbname "$RESTORE_DB" --exit-on-error --no-owner --no-privileges' \
  < "$backup_file"
docker compose --env-file "$script_dir/.env" -f "$script_dir/compose.prod.yaml" exec -T -e RESTORE_DB="$restore_db" postgres \
  sh -c 'psql --username "$POSTGRES_USER" --dbname "$RESTORE_DB" --tuples-only --command "SELECT count(*) FROM schema_migrations"'

printf 'Backup restore verified successfully: %s\n' "$backup_file"
