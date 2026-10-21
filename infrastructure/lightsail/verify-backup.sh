#!/bin/sh
# Restore a backup into an isolated scratch database; never touch the live DB.
set -eu
if [ "$#" -ne 1 ] || [ ! -f "$1" ]; then
  echo "Usage: $0 /path/to/akeluwa-YYYYMMDDTHHMMSSZ.dump" >&2
  exit 2
fi
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
env_file="$script_dir/.env"
[ -f "$env_file" ] || { echo "Missing $env_file" >&2; exit 2; }
command -v docker >/dev/null 2>&1 || { echo "Docker is required." >&2; exit 2; }
command -v sha256sum >/dev/null 2>&1 || { echo "sha256sum is required." >&2; exit 2; }

archive=$(CDPATH= cd -- "$(dirname -- "$1")" && pwd)/$(basename -- "$1")
checksum="$archive.sha256"
[ -f "$checksum" ] || { echo "Missing checksum: $checksum" >&2; exit 1; }
(cd "$(dirname "$archive")" && sha256sum -c "$(basename "$checksum")")

compose() {
  docker compose --project-directory "$script_dir" --env-file "$env_file" -f "$script_dir/compose.yaml" "$@"
}
compose exec -T postgres pg_restore --list < "$archive" > /dev/null
scratch="akeluwa_restore_$(date -u +%Y%m%d%H%M%S)_$$"
created=0
cleanup() {
  if [ "$created" -eq 1 ]; then
    compose exec -T postgres sh -ec 'dropdb -U "$POSTGRES_USER" --if-exists "$1"' _ "$scratch" || true
  fi
}
trap cleanup EXIT HUP INT TERM
compose exec -T postgres sh -ec 'createdb -U "$POSTGRES_USER" "$1"' _ "$scratch"
created=1
compose exec -T postgres sh -ec 'exec pg_restore -U "$POSTGRES_USER" -d "$1" --exit-on-error --no-owner --no-privileges' _ "$scratch" < "$archive"
count=$(compose exec -T postgres sh -ec 'psql -U "$POSTGRES_USER" -d "$1" -At -v ON_ERROR_STOP=1 -c "SELECT COUNT(*) FROM schema_migrations"' _ "$scratch")
case "$count" in ''|*[!0-9]*) echo "Unexpected schema migration count: $count" >&2; exit 1;; esac
if [ "$count" -lt 1 ]; then
  echo "Restored archive does not contain recorded migrations." >&2
  exit 1
fi
echo "Restored successfully into temporary database $scratch ($count migrations)."
echo "Temporary database will be deleted; record the result before production approval."
