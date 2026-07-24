#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "$#" -ne 2 ]]; then
  echo "usage: $0 <dockerhub-namespace> <full-commit-sha>" >&2
  exit 64
fi

namespace="$1"
candidate_sha="$2"
if [[ ! "$namespace" =~ ^[a-z0-9][a-z0-9._-]*$ ]]; then
  echo "invalid Docker Hub namespace" >&2
  exit 64
fi
if [[ ! "$candidate_sha" =~ ^[0-9a-f]{40}$ ]]; then
  echo "invalid release identifier" >&2
  exit 64
fi

app_dir="${APP_DIR:-/opt/balanja}"
state_dir="$app_dir/.deploy"
compose_file="$app_dir/compose.production.yaml"
runtime_env="$app_dir/.env"
release_env="$app_dir/.release.env"
docker_bin="${DOCKER_BIN:-docker}"
flock_bin="${FLOCK_BIN:-flock}"
smoke_script="${SMOKE_SCRIPT:-$app_dir/smoke.sh}"
public_url="${PUBLIC_URL:-https://pos.marvcore.com}"

for required_file in "$compose_file" "$runtime_env" "$smoke_script"; do
  if [[ ! -r "$required_file" ]]; then
    echo "required deployment file is not readable: $required_file" >&2
    exit 66
  fi
done

mkdir -p "$state_dir"
exec 9>"$state_dir/deploy.lock"
if ! "$flock_bin" -n 9; then
  echo "another deployment is already running" >&2
  exit 75
fi

current_sha=""
if [[ -s "$state_dir/current" ]]; then
  current_sha="$(tr -d '\r\n' <"$state_dir/current")"
  if [[ ! "$current_sha" =~ ^[0-9a-f]{40}$ ]]; then
    echo "stored release identifier is invalid" >&2
    exit 65
  fi
fi

write_release_env() {
  local sha="$1"
  local temporary
  temporary="$(mktemp "$app_dir/.release.env.XXXXXX")"
  chmod 600 "$temporary"
  {
    printf 'API_IMAGE=docker.io/%s/balanja-api:%s\n' "$namespace" "$sha"
    printf 'WEB_IMAGE=docker.io/%s/balanja-web:%s\n' "$namespace" "$sha"
  } >"$temporary"
  mv "$temporary" "$release_env"
}

write_state() {
  local name="$1"
  local value="$2"
  local temporary
  temporary="$(mktemp "$state_dir/$name.XXXXXX")"
  printf '%s\n' "$value" >"$temporary"
  mv "$temporary" "$state_dir/$name"
}

compose() {
  "$docker_bin" compose \
    --env-file "$runtime_env" \
    --env-file "$release_env" \
    -f "$compose_file" \
    "$@"
}

verify_release() {
  compose up -d --wait --wait-timeout "${DEPLOY_WAIT_TIMEOUT:-120}" &&
    "$smoke_script" http://localhost &&
  "$smoke_script" "$public_url"
}

rollback() {
  if [[ -z "$current_sha" ]]; then
    echo "candidate failed and no verified release exists to restore" >&2
    return 1
  fi

  echo "candidate failed; restoring $current_sha" >&2
  write_release_env "$current_sha" &&
    compose pull &&
    compose up -d --wait --wait-timeout "${DEPLOY_WAIT_TIMEOUT:-120}" &&
  "$smoke_script" http://localhost
}

write_release_env "$candidate_sha"
if ! compose pull || ! verify_release; then
  rollback || echo "rollback failed; inspect Docker Compose logs immediately" >&2
  exit 1
fi

if [[ -n "$current_sha" && "$current_sha" != "$candidate_sha" ]]; then
  write_state previous "$current_sha"
fi
write_state current "$candidate_sha"
if ! "$docker_bin" image prune -f >/dev/null; then
  echo "warning: unused image cleanup failed" >&2
fi
echo "release $candidate_sha verified"
