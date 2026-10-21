#!/bin/sh
# Read-only HTTPS staging smoke test: never writes user or production data.
set -eu
if [ "$#" -ne 1 ]; then
  echo "Usage: $0 https://staging.example.com" >&2
  exit 2
fi
origin=${1%/}
case "$origin" in https://staging.*) ;; *)
  echo "Refusing non-HTTPS or non-staging hostname: $origin" >&2
  exit 2
  ;;
esac
command -v curl >/dev/null 2>&1 || { echo "curl is required" >&2; exit 2; }

for route in / /services /contact /akeluwatoolbox/ \
  /akeluwatoolbox/digital-stamp-maker/ /akeluwatoolbox/extra-tools/ \
  /publicinfohub/ /publicinfohub/offices/ /publicinfohub/utilities/ \
  /api/v1/services /api/v1/portfolio
do
  curl --fail --silent --show-error --location --max-time 25 \
    --output /dev/null "$origin$route" || {
    echo "Staging route failed: $origin$route" >&2
    exit 1
  }
  echo "OK: $route"
done

headers=$(curl --fail --silent --show-error --head --max-time 20 "$origin/")
printf '%s\n' "$headers" | grep -iq '^x-robots-tag:.*noindex' || {
  echo "Staging must include an X-Robots-Tag: noindex header" >&2
  exit 1
}
robots=$(curl --fail --silent --show-error --max-time 20 "$origin/robots.txt")
printf '%s\n' "$robots" | grep -q 'Disallow: /' || {
  echo "Staging robots.txt must disallow crawlers" >&2
  exit 1
}
echo "Read-only staging smoke passed. Verify authentication, email, backups, browsers and security separately."
