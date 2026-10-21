#!/bin/sh
# PostgreSQL logical backup for the Lightsail Compose stack.
# Produces a local, mode-0600 archive + SHA-256 checksum; DOES NOT upload off-host.
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
env_file="$script_dir/.env"
if [ ! -f "$env_file" ]; then
  echo "Missing private $env_file; configure it before running backup." >&2
  exit 2
fi
command -v docker >/dev/null 2>&1 || { echo "Docker is required." >&2; exit 2; }
command -v sha256sum >/dev/null 2>&1 || { echo "sha256sum is required." >&2; exit 2; }

umask 077
backup_dir=${BACKUP_DIR:-"$script_dir/backups"}
mkdir -p "$backup_dir"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
target="$backup_dir/akeluwa-$stamp.dump"
temporary="$target.tmp"
if [ -e "$target" ]; then
  echo "Backup already exists: $target" >&2
  exit 1
fi
trap 'rm -f "$temporary"' EXIT HUP INT TERM

compose() {
  docker compose --project-directory "$script_dir" --env-file "$env_file" -f "$script_dir/compose.yaml" "$@"
}
compose exec -T postgres sh -ec 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner --no-privileges' > "$temporary"
if [ ! -s "$temporary" ]; then
  echo "Backup is empty; refusing to publish." >&2
  exit 1
fi
compose exec -T postgres pg_restore --list < "$temporary" >/dev/null
mv "$temporary" "$target"
(
  cd "$backup_dir"
  sha256sum "$(basename "$target")" > "$(basename "$target").sha256"
)
echo "Local backup verified: $target"
echo "NEXT: copy the dump and checksum to encrypted off-instance storage."
