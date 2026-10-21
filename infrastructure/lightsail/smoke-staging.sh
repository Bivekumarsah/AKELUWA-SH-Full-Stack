#!/bin/sh
# Read-only HTTPS staging smoke test: never writes user or production data.
set -eu
if [ "$#" -ne 1 ]; then
  echo "Usage: $0 https://staging.akeluwasoftwarehub.com.np" >&2
  exit 2
fi
origin=${1%/}
case "$origin" in https://staging.akeluwasoftwarehub.com.np) ;; *)
  echo "Refusing any host other than AKELUWA HTTPS staging: $origin" >&2
  exit 2
  ;;
esac
command -v curl >/dev/null 2>&1 || { echo "curl is required" >&2; exit 2; }

# A generic 200 from the production site is not a passing staging test.
for route in / /services /contact /akeluwatoolbox/ \
  /akeluwatoolbox/digital-stamp-maker/ /akeluwatoolbox/extra-tools/ \
  /publicinfohub/ /publicinfohub/offices/ /publicinfohub/utilities/ \
  /api/v1/services /api/v1/portfolio
do
  effective=$(curl --fail --silent --show-error --location \
    --proto '=https' --proto-redir '=https' --max-redirs 4 --max-time 25 \
    --output /dev/null --write-out '%{url_effective}' "$origin$route") || {
    echo "Staging route failed: $origin$route" >&2
    exit 1
  }
  case "$effective" in "$origin"|"$origin"/*) ;; *)
    echo "Route escaped the staging origin: $origin$route -> $effective" >&2
    exit 1
    ;;
  esac
  echo "OK: $route"
done

headers=$(curl --fail --silent --show-error --head --max-time 20 "$origin/")
printf '%s\n' "$headers" | grep -iq '^x-robots-tag:.*noindex' || {
  echo "Staging must include X-Robots-Tag: noindex" >&2
  exit 1
}
printf '%s\n' "$headers" | grep -iq '^strict-transport-security:' || {
  echo "Staging must include Strict-Transport-Security" >&2
  exit 1
}
robots=$(curl --fail --silent --show-error --max-time 20 "$origin/robots.txt")
printf '%s\n' "$robots" | grep -q 'Disallow: /' || {
  echo "Staging robots.txt must disallow crawlers" >&2
  exit 1
}
for resource in services portfolio
do
  json=$(curl --fail --silent --show-error --max-time 20 \
    -H 'Accept: application/json' "$origin/api/v1/$resource") || exit 1
  printf '%s\n' "$json" | grep -q "\"$resource\"" || {
    echo "API /$resource did not return the expected JSON field" >&2
    exit 1
  }
done
echo "Read-only staging smoke passed. Auth, SMTP, mobile devices, backups and rollback still require separate verification."
