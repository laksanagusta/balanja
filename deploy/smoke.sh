#!/bin/sh
set -eu

base_url="${1:-http://localhost}"

curl --fail-with-body --silent --show-error "$base_url/healthz" >/dev/null
curl --fail-with-body --silent --show-error "$base_url/readyz" >/dev/null

status="$(curl --silent --output /dev/null --write-out '%{http_code}' "$base_url/api/v1/products")"
if [ "$status" != "401" ]; then
  echo "expected unauthenticated products status 401, got $status" >&2
  exit 1
fi

curl --fail-with-body --silent --show-error "$base_url/" | grep -q '<div id="root"></div>'
echo "smoke checks passed"
