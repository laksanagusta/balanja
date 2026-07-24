# Tencent Cloud Docker Hub CI/CD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy every verified `main` commit to `https://pos.marvcore.com` as immutable Docker Hub images on a single Tencent Cloud Ubuntu server, with serialized releases and automatic image rollback.

**Architecture:** GitHub Actions tests the Go and Vite applications, builds two SHA-tagged Docker images, and publishes them to Docker Hub. A production job copies versioned deployment assets over strict-host-key SSH and invokes a server-side Bash deployer that pulls candidates, updates Compose atomically, verifies health, and restores the previous SHA on failure. Application secrets stay in `/opt/balanja/.env`; image references live separately in `/opt/balanja/.release.env`.

**Tech Stack:** GitHub Actions, Docker Buildx, Docker Hub, Docker Compose v2, Bash, Caddy, Go 1.25, Node.js 24, npm, SSH.

---

## File Map

- Create `.github/workflows/ci-cd.yml`: pull-request CI, Docker Hub publishing, and serialized SSH production deployment.
- Create `deploy/compose.production.yaml`: production-only, image-based Compose stack.
- Create `deploy/deploy.sh`: locked release state machine, health verification, and rollback.
- Create `deploy/bootstrap-server.sh`: idempotent Ubuntu deployment-user and directory bootstrap.
- Create `deploy/.env.production.example`: documented runtime environment contract.
- Create `deploy/.release.env.example`: documented immutable image-reference contract.
- Create `deploy/tests/deploy_test.sh`: fake-Docker tests for successful deployment and rollback.
- Modify `deploy/smoke.sh`: bounded local/public HTTP checks.
- Modify `docs/deployment.md`: Tencent Cloud, Docker Hub, GitHub, first-deploy, recovery, and rotation runbook.
- Modify `README.md`: link the production workflow and deployment guide.

### Task 1: Define the Production Compose Contract

**Files:**
- Create: `deploy/compose.production.yaml`
- Create: `deploy/.env.production.example`
- Create: `deploy/.release.env.example`

- [ ] **Step 1: Create environment contract examples**

Create `deploy/.env.production.example`:

```dotenv
SITE_ADDRESS=pos.marvcore.com
DATABASE_URL=postgres://balanja_runtime:password@supavisor-host:5432/postgres?sslmode=require
CLERK_ISSUER_URL=https://your-production-clerk-issuer
CLERK_AUDIENCE=balanja
ALLOWED_ORIGINS=https://pos.marvcore.com
DB_MAX_CONNS=10
SHUTDOWN_TIMEOUT=10s
R2_ENABLED=false
R2_ENDPOINT=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_BASE_URL=
```

Create `deploy/.release.env.example`:

```dotenv
API_IMAGE=docker.io/your-dockerhub-user/balanja-api:full-git-commit-sha
WEB_IMAGE=docker.io/your-dockerhub-user/balanja-web:full-git-commit-sha
```

- [ ] **Step 2: Create the image-only production Compose file**

Create `deploy/compose.production.yaml`:

```yaml
name: balanja

services:
  api:
    image: ${API_IMAGE:?API_IMAGE is required}
    pull_policy: always
    environment:
      PORT: "8080"
      DATABASE_URL: ${DATABASE_URL:?DATABASE_URL is required}
      CLERK_ISSUER_URL: ${CLERK_ISSUER_URL:?CLERK_ISSUER_URL is required}
      CLERK_AUDIENCE: ${CLERK_AUDIENCE:?CLERK_AUDIENCE is required}
      ALLOWED_ORIGINS: ${ALLOWED_ORIGINS:?ALLOWED_ORIGINS is required}
      DB_MAX_CONNS: ${DB_MAX_CONNS:-10}
      SHUTDOWN_TIMEOUT: ${SHUTDOWN_TIMEOUT:-10s}
      R2_ENABLED: ${R2_ENABLED:-false}
      R2_ENDPOINT: ${R2_ENDPOINT:-}
      R2_ACCESS_KEY_ID: ${R2_ACCESS_KEY_ID:-}
      R2_SECRET_ACCESS_KEY: ${R2_SECRET_ACCESS_KEY:-}
      R2_BUCKET: ${R2_BUCKET:-}
      R2_PUBLIC_BASE_URL: ${R2_PUBLIC_BASE_URL:-}
    expose:
      - "8080"
    healthcheck:
      test: ["CMD", "wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8080/readyz"]
      interval: 10s
      timeout: 3s
      retries: 6
      start_period: 10s
    restart: unless-stopped
    mem_limit: 512m
    security_opt:
      - no-new-privileges:true
    logging:
      driver: json-file
      options:
        max-size: 10m
        max-file: "3"

  web:
    image: ${WEB_IMAGE:?WEB_IMAGE is required}
    pull_policy: always
    environment:
      SITE_ADDRESS: ${SITE_ADDRESS:?SITE_ADDRESS is required}
    depends_on:
      api:
        condition: service_healthy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - caddy_data:/data
      - caddy_config:/config
    restart: unless-stopped
    mem_limit: 256m
    security_opt:
      - no-new-privileges:true
    logging:
      driver: json-file
      options:
        max-size: 10m
        max-file: "3"

volumes:
  caddy_data:
  caddy_config:
```

- [ ] **Step 3: Render Compose with non-secret fixtures**

Run:

```bash
cp deploy/.env.production.example /tmp/balanja-production.env
cp deploy/.release.env.example /tmp/balanja-release.env
docker compose \
  --env-file /tmp/balanja-production.env \
  --env-file /tmp/balanja-release.env \
  -f deploy/compose.production.yaml \
  config --quiet
```

Expected: exit status `0` with no missing-variable error.

- [ ] **Step 4: Verify rendered security and routing constraints**

Run:

```bash
docker compose \
  --env-file /tmp/balanja-production.env \
  --env-file /tmp/balanja-release.env \
  -f deploy/compose.production.yaml \
  config |
  grep -E 'no-new-privileges|pos\.marvcore\.com|balanja-api|balanja-web'
```

Expected: all four contract values appear; the API has no host `ports` mapping.

- [ ] **Step 5: Commit the Compose contract**

```bash
git add deploy/compose.production.yaml deploy/.env.production.example deploy/.release.env.example
git commit -m "ops: add production Compose contract"
```

### Task 2: Bound the Smoke Checks

**Files:**
- Modify: `deploy/smoke.sh`

- [ ] **Step 1: Replace unbounded curl calls**

Use one helper so every request has connection and total timeouts:

```sh
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
```

- [ ] **Step 2: Verify shell syntax**

Run:

```bash
sh -n deploy/smoke.sh
```

Expected: exit status `0`.

- [ ] **Step 3: Verify the smoke-check contract**

Run:

```bash
rg -n --fixed-strings \
  -e '--connect-timeout' \
  -e '--max-time' \
  -e '/healthz' \
  -e '/readyz' \
  -e '/api/v1/products' \
  -e '<div id="root"></div>' \
  deploy/smoke.sh
```

Expected: every bounded request and response assertion appears.

- [ ] **Step 4: Commit bounded smoke checks**

```bash
git add deploy/smoke.sh
git commit -m "ops: bound production smoke checks"
```

### Task 3: Implement and Test the Deployment State Machine

**Files:**
- Create: `deploy/deploy.sh`
- Create: `deploy/tests/deploy_test.sh`

- [ ] **Step 1: Write the fake-Docker deployment tests**

Create `deploy/tests/deploy_test.sh` with two isolated cases:

```bash
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
  chmod +x "$fixture/bin/docker" "$fixture/bin/smoke"

  export APP_DIR="$fixture"
  export DOCKER_BIN="$fixture/bin/docker"
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
```

- [ ] **Step 2: Run the tests and verify they fail**

Run:

```bash
bash deploy/tests/deploy_test.sh
```

Expected: FAIL because `deploy/deploy.sh` does not exist.

- [ ] **Step 3: Implement the locked deployer**

Create `deploy/deploy.sh`:

```bash
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
smoke_script="${SMOKE_SCRIPT:-$app_dir/smoke.sh}"
public_url="${PUBLIC_URL:-https://pos.marvcore.com}"

mkdir -p "$state_dir"
exec 9>"$state_dir/deploy.lock"
if ! flock -n 9; then
  echo "another deployment is already running" >&2
  exit 75
fi

current_sha=""
if [[ -s "$state_dir/current" ]]; then
  current_sha="$(tr -d '\r\n' <"$state_dir/current")"
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
  compose up -d --wait --wait-timeout "${DEPLOY_WAIT_TIMEOUT:-120}"
  "$smoke_script" http://localhost
  "$smoke_script" "$public_url"
}

rollback() {
  if [[ -z "$current_sha" ]]; then
    echo "candidate failed and no verified release exists to restore" >&2
    return 1
  fi
  echo "candidate failed; restoring $current_sha" >&2
  write_release_env "$current_sha"
  compose pull
  compose up -d --wait --wait-timeout "${DEPLOY_WAIT_TIMEOUT:-120}"
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
"$docker_bin" image prune -f >/dev/null
echo "release $candidate_sha verified"
```

- [ ] **Step 4: Make scripts executable and run tests**

Run:

```bash
chmod +x deploy/deploy.sh deploy/tests/deploy_test.sh
bash -n deploy/deploy.sh
bash deploy/tests/deploy_test.sh
```

Expected: `deployment tests passed`.

- [ ] **Step 5: Commit the deployment state machine**

```bash
git add deploy/deploy.sh deploy/tests/deploy_test.sh
git commit -m "ops: add verified deployment rollback"
```

### Task 4: Bootstrap the Ubuntu Server Safely

**Files:**
- Create: `deploy/bootstrap-server.sh`

- [ ] **Step 1: Add an idempotent root bootstrap**

Create `deploy/bootstrap-server.sh`:

```bash
#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "run this script as root or with sudo" >&2
  exit 77
fi

deploy_user="${1:-balanja-deploy}"
app_dir="${APP_DIR:-/opt/balanja}"

command -v docker >/dev/null || {
  echo "Docker Engine is required" >&2
  exit 69
}
docker compose version >/dev/null || {
  echo "Docker Compose v2 plugin is required" >&2
  exit 69
}
command -v flock >/dev/null || {
  echo "flock is required (package: util-linux)" >&2
  exit 69
}
command -v curl >/dev/null || {
  echo "curl is required" >&2
  exit 69
}

if ! id "$deploy_user" >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash "$deploy_user"
fi
usermod -aG docker "$deploy_user"
install -d -m 0750 -o "$deploy_user" -g "$deploy_user" "$app_dir"
install -d -m 0750 -o "$deploy_user" -g "$deploy_user" "$app_dir/.deploy"
systemctl enable --now docker

echo "server bootstrap complete for $deploy_user"
echo "start a new login session before testing Docker group access"
```

- [ ] **Step 2: Verify syntax and idempotent constructs**

Run:

```bash
chmod +x deploy/bootstrap-server.sh
bash -n deploy/bootstrap-server.sh
rg -n 'useradd|usermod|install -d|systemctl enable' deploy/bootstrap-server.sh
```

Expected: syntax passes and all four guarded bootstrap operations are present.

- [ ] **Step 3: Commit server bootstrap**

```bash
git add deploy/bootstrap-server.sh
git commit -m "ops: add Tencent server bootstrap"
```

### Task 5: Add GitHub CI, Docker Hub Publishing, and SSH Deployment

**Files:**
- Create: `.github/workflows/ci-cd.yml`

- [ ] **Step 1: Add test jobs with least-privilege defaults**

Create the workflow with:

```yaml
name: CI/CD

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

jobs:
  backend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-go@v5
        with:
          go-version-file: backend/go.mod
          cache-dependency-path: backend/go.sum
      - run: go vet ./...
      - run: go test ./... -race
      - run: go build ./cmd/api

  frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v4
        with:
          node-version: "24"
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci --ignore-scripts
      - run: npm test
      - run: npm run build
        env:
          VITE_CLERK_PUBLISHABLE_KEY: pk_test_ci_placeholder

  deployment-assets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - run: sh -n deploy/smoke.sh
      - name: Validate Bash syntax
        run: |
          for script in deploy/deploy.sh deploy/bootstrap-server.sh deploy/tests/deploy_test.sh; do
            bash -n "$script"
          done
      - run: bash deploy/tests/deploy_test.sh
      - name: Validate production Compose
        run: |
          docker compose \
            --env-file deploy/.env.production.example \
            --env-file deploy/.release.env.example \
            -f deploy/compose.production.yaml \
            config --quiet
```

- [ ] **Step 2: Add matrix image builds and Docker Hub publishing**

Append a `container-images` job that depends on all validation:

```yaml
  container-images:
    needs: [backend, frontend, deployment-assets]
    runs-on: ubuntu-latest
    strategy:
      matrix:
        include:
          - component: api
            dockerfile: backend/Dockerfile
            image: balanja-api
          - component: web
            dockerfile: Dockerfile.frontend
            image: balanja-web
    steps:
      - uses: actions/checkout@v6
      - uses: docker/setup-buildx-action@v3
      - name: Log in to Docker Hub
        if: github.event_name == 'push'
        uses: docker/login-action@v3
        with:
          username: ${{ vars.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      - name: Build or publish
        uses: docker/build-push-action@v6
        with:
          context: .
          file: ${{ matrix.dockerfile }}
          push: ${{ github.event_name == 'push' }}
          tags: |
            ${{ vars.DOCKERHUB_USERNAME }}/${{ matrix.image }}:${{ github.sha }}
            ${{ vars.DOCKERHUB_USERNAME }}/${{ matrix.image }}:main
          build-args: |
            VITE_CLERK_PUBLISHABLE_KEY=${{ github.event_name == 'push' && secrets.VITE_CLERK_PUBLISHABLE_KEY || 'pk_test_ci_placeholder' }}
            VITE_API_BASE_URL=
          cache-from: type=gha,scope=${{ matrix.component }}
          cache-to: type=gha,mode=max,scope=${{ matrix.component }}
          provenance: true
          sbom: true
```

Keep `DOCKERHUB_TOKEN` and `VITE_CLERK_PUBLISHABLE_KEY` as repository secrets
because this matrix must also build pull requests without attaching the
protected production environment. Conditional login ensures pull-request jobs
do not receive or use the Docker Hub token.

- [ ] **Step 3: Add strict SSH production deployment**

Append:

```yaml
  deploy-production:
    if: github.event_name == 'push'
    needs: container-images
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://pos.marvcore.com
    concurrency:
      group: production
      cancel-in-progress: false
    steps:
      - uses: actions/checkout@v6
      - name: Configure SSH
        env:
          DEPLOY_SSH_KEY: ${{ secrets.DEPLOY_SSH_KEY }}
          DEPLOY_KNOWN_HOSTS: ${{ secrets.DEPLOY_KNOWN_HOSTS }}
        run: |
          install -d -m 700 ~/.ssh
          printf '%s\n' "$DEPLOY_SSH_KEY" > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key
          printf '%s\n' "$DEPLOY_KNOWN_HOSTS" > ~/.ssh/known_hosts
          chmod 600 ~/.ssh/known_hosts
      - name: Upload deployment assets
        env:
          DEPLOY_HOST: ${{ secrets.DEPLOY_HOST }}
          DEPLOY_PORT: ${{ secrets.DEPLOY_PORT }}
          DEPLOY_USER: ${{ secrets.DEPLOY_USER }}
        run: |
          tar -C deploy -czf - compose.production.yaml deploy.sh smoke.sh |
            ssh -i ~/.ssh/deploy_key \
              -p "${DEPLOY_PORT:-22}" \
              -o BatchMode=yes \
              -o StrictHostKeyChecking=yes \
              "$DEPLOY_USER@$DEPLOY_HOST" \
              "tar -C /opt/balanja -xzf - && chmod 750 /opt/balanja/deploy.sh /opt/balanja/smoke.sh"
      - name: Deploy and verify
        env:
          DEPLOY_HOST: ${{ secrets.DEPLOY_HOST }}
          DEPLOY_PORT: ${{ secrets.DEPLOY_PORT }}
          DEPLOY_USER: ${{ secrets.DEPLOY_USER }}
          DOCKERHUB_USERNAME: ${{ vars.DOCKERHUB_USERNAME }}
        run: |
          printf -v remote_command \
            '/opt/balanja/deploy.sh %q %q' \
            "$DOCKERHUB_USERNAME" \
            "$GITHUB_SHA"
          ssh -i ~/.ssh/deploy_key \
            -p "${DEPLOY_PORT:-22}" \
            -o BatchMode=yes \
            -o StrictHostKeyChecking=yes \
            "$DEPLOY_USER@$DEPLOY_HOST" \
            "$remote_command"
```

- [ ] **Step 4: Validate workflow structure locally**

Run:

```bash
go run github.com/rhysd/actionlint/cmd/actionlint@v1.7.7 .github/workflows/ci-cd.yml
rg -n 'pull_request:|push:|permissions:|production|cancel-in-progress: false|StrictHostKeyChecking=yes' .github/workflows/ci-cd.yml
```

Expected: `actionlint` exits `0` and every required safety control is present.

- [ ] **Step 5: Commit CI/CD workflow**

```bash
git add .github/workflows/ci-cd.yml
git commit -m "ci: deploy main to Tencent Cloud"
```

### Task 6: Write the Operator Runbook

**Files:**
- Modify: `docs/deployment.md`
- Modify: `README.md`

- [ ] **Step 1: Document external prerequisites**

Replace the generic VPS instructions with explicit checks for:

```bash
docker version
docker compose version
curl --version
getent hosts pos.marvcore.com
```

Document Tencent Security Group inbound TCP 22/80/443 and the
`pos.marvcore.com` A record.

- [ ] **Step 2: Document Docker Hub setup**

Include two repositories, `balanja-api` and `balanja-web`, a CI token with write
access, and a separate server token with read-only access. Show server login:

```bash
printf '%s' "$DOCKERHUB_READ_TOKEN" |
  docker login --username "$DOCKERHUB_USERNAME" --password-stdin
```

- [ ] **Step 3: Document first server bootstrap**

Include:

```bash
sudo ./deploy/bootstrap-server.sh balanja-deploy
sudo install -m 0750 -o balanja-deploy -g balanja-deploy \
  deploy/compose.production.yaml deploy/deploy.sh deploy/smoke.sh /opt/balanja/
sudo install -m 0600 -o balanja-deploy -g balanja-deploy \
  deploy/.env.production.example /opt/balanja/.env
sudo install -m 0600 -o balanja-deploy -g balanja-deploy \
  deploy/.release.env.example /opt/balanja/.release.env
```

Require the operator to edit real values directly on the server and never copy
`backend/.env` into Git. Document installing the dedicated deployment public
key:

```bash
sudo install -d -m 0700 -o balanja-deploy -g balanja-deploy \
  /home/balanja-deploy/.ssh
printf '%s\n' "$DEPLOY_PUBLIC_KEY" |
  sudo tee /home/balanja-deploy/.ssh/authorized_keys >/dev/null
sudo chown balanja-deploy:balanja-deploy \
  /home/balanja-deploy/.ssh/authorized_keys
sudo chmod 0600 /home/balanja-deploy/.ssh/authorized_keys
```

- [ ] **Step 4: Document GitHub Environment configuration**

List exact values:

- Repository/environment variable: `DOCKERHUB_USERNAME`.
- Secret: `DOCKERHUB_TOKEN`.
- Production secret: `VITE_CLERK_PUBLISHABLE_KEY`.
- Production secrets: `DEPLOY_HOST`, `DEPLOY_PORT`, `DEPLOY_USER`,
  `DEPLOY_SSH_KEY`, and `DEPLOY_KNOWN_HOSTS`.

Show safe host-key acquisition from a trusted operator machine:

```bash
ssh-keyscan -p 22 -H "$DEPLOY_HOST"
```

State that the fingerprint must be compared with the server console before
placing it in GitHub.

- [ ] **Step 5: Document first deploy, inspection, and rollback**

Include:

```bash
docker compose \
  --env-file /opt/balanja/.env \
  --env-file /opt/balanja/.release.env \
  -f /opt/balanja/compose.production.yaml ps

docker compose \
  --env-file /opt/balanja/.env \
  --env-file /opt/balanja/.release.env \
  -f /opt/balanja/compose.production.yaml logs --tail=200 api web

/opt/balanja/deploy.sh "$DOCKERHUB_USERNAME" "<previous-full-commit-sha>"
```

Document credential rotation and clarify that migrations remain manual.

- [ ] **Step 6: Link the runbook from README**

Add a short production section linking `docs/deployment.md`, naming
`https://pos.marvcore.com`, Docker Hub images, and `.github/workflows/ci-cd.yml`.

- [ ] **Step 7: Verify documentation contains no real secrets**

Run:

```bash
rg -n 'pk_live_|sk_live_|AKIA|BEGIN .*PRIVATE KEY' README.md docs/deployment.md deploy
```

Expected: no real credential material; only obvious placeholders.

- [ ] **Step 8: Commit the operator runbook**

```bash
git add README.md docs/deployment.md
git commit -m "docs: add Tencent deployment runbook"
```

### Task 7: Full Verification

**Files:**
- Verify all files created or modified in Tasks 1-6.

- [ ] **Step 1: Run backend verification**

```bash
cd backend
go vet ./...
go test ./... -race
go build ./cmd/api
```

Expected: all commands exit `0`.

- [ ] **Step 2: Run frontend verification**

```bash
cd frontend
npm ci --ignore-scripts
npm test
VITE_CLERK_PUBLISHABLE_KEY=pk_test_ci_placeholder npm run build
```

Expected: all tests pass and Vite produces `frontend/dist`.

- [ ] **Step 3: Run deployment tests**

```bash
sh -n deploy/smoke.sh
for script in deploy/deploy.sh deploy/bootstrap-server.sh deploy/tests/deploy_test.sh; do
  bash -n "$script"
done
bash deploy/tests/deploy_test.sh
docker compose \
  --env-file deploy/.env.production.example \
  --env-file deploy/.release.env.example \
  -f deploy/compose.production.yaml \
  config --quiet
```

Expected: syntax checks pass, deployment tests print `deployment tests passed`,
and Compose validation exits `0`.

- [ ] **Step 4: Build both production images locally**

```bash
docker build -f backend/Dockerfile -t balanja-api:verification .
docker build \
  -f Dockerfile.frontend \
  --build-arg VITE_CLERK_PUBLISHABLE_KEY=pk_test_ci_placeholder \
  --build-arg VITE_API_BASE_URL= \
  -t balanja-web:verification \
  .
```

Expected: both images build successfully.

- [ ] **Step 5: Review only deployment-related changes**

```bash
git status --short
git diff --check
git diff -- .github README.md docs/deployment.md deploy
```

Expected: no whitespace errors and no unrelated user changes in the deployment
diff.

- [ ] **Step 6: Commit any correction discovered by verification**

If verification requires a deployment-scoped correction, edit only the affected
deployment file, rerun the failing command, then commit:

```bash
git add .github README.md docs/deployment.md deploy
git commit -m "fix: harden production deployment validation"
```

- [ ] **Step 7: Prepare the GitHub and server handoff**

Report:

- Commits created.
- Test/build commands and results.
- Docker Hub repositories and tokens the user must create.
- GitHub variables/secrets the user must add.
- DNS/Security Group checks still requiring access to Tencent Cloud.
- Exact first bootstrap and deployment commands.
