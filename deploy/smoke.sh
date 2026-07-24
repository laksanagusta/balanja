#!/bin/sh
set -eu

base_url="${1:-http://localhost}"

request() {
  curl \
    --connect-timeout "${SMOKE_CONNECT_TIMEOUT:-5}" \
    --max-time "${SMOKE_MAX_TIME:-20}" \
    --fail-with-body \
    --silent \
    --show-error \
    "$@"
}

request "$base_url/healthz" >/dev/null
request "$base_url/readyz" >/dev/null

status="$(
  request \
    --output /dev/null \
    --write-out '%{http_code}' \
    "$base_url/api/v1/products" ||
    true
)"
if [ "$status" != "401" ]; then
  echo "expected unauthenticated products status 401, got ${status:-request-failed}" >&2
  exit 1
fi

request "$base_url/" | grep -q '<div id="root"></div>'
echo "smoke checks passed for $base_url"
