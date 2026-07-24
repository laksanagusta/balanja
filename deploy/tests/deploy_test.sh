#!/usr/bin/env bash
set -Eeuo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
deploy_script="$repo_root/deploy/deploy.sh"
old_sha="1111111111111111111111111111111111111111"
new_sha="2222222222222222222222222222222222222222"
bad_sha="3333333333333333333333333333333333333333"

assert_file_equals() {
  local expected="$1"
  local path="$2"
  local actual
  actual="$(cat "$path")"
  if [[ "$actual" != "$expected" ]]; then
    printf 'expected %s to contain %q, got %q\n' "$path" "$expected" "$actual" >&2
    exit 1
  fi
}

make_fixture() {
  fixture="$(mktemp -d)"
  mkdir -p "$fixture/bin" "$fixture/.deploy"
  touch "$fixture/compose.production.yaml" "$fixture/.env"
  printf '%s\n' "$old_sha" >"$fixture/.deploy/current"
  cat >"$fixture/.release.env" <<ENV
API_IMAGE=docker.io/example/balanja-api:$old_sha
WEB_IMAGE=docker.io/example/balanja-web:$old_sha
ENV

  cat >"$fixture/bin/docker" <<'DOCKER'
#!/usr/bin/env bash
set -eu
printf '%s\n' "$*" >>"$FAKE_DOCKER_LOG"
if [[ -f "$APP_DIR/.release.env" ]]; then
  cat "$APP_DIR/.release.env" >>"$FAKE_DOCKER_LOG"
fi
exit 0
DOCKER

  cat >"$fixture/bin/flock" <<'FLOCK'
#!/usr/bin/env bash
set -eu
exit 0
FLOCK

  cat >"$fixture/bin/smoke" <<'SMOKE'
#!/usr/bin/env bash
set -eu
count=0
if [[ -f "$FAKE_SMOKE_COUNT" ]]; then
  count="$(cat "$FAKE_SMOKE_COUNT")"
fi
count=$((count + 1))
printf '%s\n' "$count" >"$FAKE_SMOKE_COUNT"
if [[ "${FAIL_SMOKE_ON_CALL:-0}" == "$count" ]]; then
  exit 1
fi
exit 0
SMOKE
  chmod +x "$fixture/bin/docker" "$fixture/bin/flock" "$fixture/bin/smoke"

  export APP_DIR="$fixture"
  export DOCKER_BIN="$fixture/bin/docker"
  export FLOCK_BIN="$fixture/bin/flock"
  export SMOKE_SCRIPT="$fixture/bin/smoke"
  export FAKE_DOCKER_LOG="$fixture/docker.log"
  export FAKE_SMOKE_COUNT="$fixture/smoke.count"
}

test_success_records_release() {
  make_fixture
  "$deploy_script" example "$new_sha"
  assert_file_equals "$new_sha" "$fixture/.deploy/current"
  assert_file_equals "$old_sha" "$fixture/.deploy/previous"
  grep -q "balanja-api:$new_sha" "$fixture/.release.env"
  grep -q "balanja-web:$new_sha" "$fixture/.release.env"
}

test_failed_smoke_restores_previous_release() {
  make_fixture
  export FAIL_SMOKE_ON_CALL=1
  if "$deploy_script" example "$bad_sha"; then
    echo "deployment unexpectedly succeeded" >&2
    exit 1
  fi
  assert_file_equals "$old_sha" "$fixture/.deploy/current"
  grep -q "balanja-api:$old_sha" "$fixture/.release.env"
  grep -q "balanja-web:$old_sha" "$fixture/.release.env"
  grep -q "balanja-api:$bad_sha" "$fixture/docker.log"
  grep -q "balanja-api:$old_sha" "$fixture/docker.log"
}

test_success_records_release
test_failed_smoke_restores_previous_release
echo "deployment tests passed"
