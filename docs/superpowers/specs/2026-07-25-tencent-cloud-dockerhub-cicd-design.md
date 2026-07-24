# Tencent Cloud Docker Hub CI/CD Design

## Objective

Deploy Balanja from the `main` branch to a single Tencent Cloud Ubuntu server at
`https://pos.marvcore.com`. GitHub Actions must test the application, publish
immutable images to Docker Hub, deploy them over SSH, verify the release, and
automatically restore the previous image versions if verification fails.

## Scope

This design covers:

- CI for the Go backend and React/Vite frontend.
- Building and publishing production images to Docker Hub.
- Bootstrapping an existing Ubuntu server that already has Docker Engine and
  the Docker Compose plugin.
- HTTPS termination and reverse proxying with the existing Caddy-based web
  image.
- Automated deployment, health verification, serialization, and rollback.
- Operator documentation for first-time setup and routine recovery.

This design does not provision Supabase, Clerk, Cloudflare R2, Tencent Cloud
infrastructure, DNS records, or database schema migrations. Those services and
credentials already exist. Database migrations remain a deliberate manual
operation.

## Deployment Architecture

GitHub Actions is the control plane. Pull requests run CI without publishing or
deploying. A successful push to `main` publishes two Docker Hub images and then
starts the production deployment:

- `<dockerhub-username>/balanja-api:<full-commit-sha>`
- `<dockerhub-username>/balanja-web:<full-commit-sha>`

Production Compose references both images through `API_IMAGE` and `WEB_IMAGE`.
It does not build source code on the server and does not use `latest` for
deployment. The full Git commit SHA is the release identifier used for normal
deployments and rollbacks.

The server stores deployment assets under `/opt/balanja`:

- `compose.production.yaml`: image-based production stack.
- `.env`: stable runtime application configuration and secrets.
- `.release.env`: active API and web image references.
- `deploy.sh`: serialized deployment, verification, and rollback logic.
- `.deploy/current`: currently verified commit SHA.
- `.deploy/previous`: previously verified commit SHA.

The deployment SSH user is non-root, can run Docker, and has write access only
where needed under `/opt/balanja`.

## CI Workflow

The workflow runs on pull requests targeting `main` and pushes to `main`.

Backend verification:

1. Set up the Go version declared by `backend/go.mod`.
2. Download modules using the checked-in `go.sum`.
3. Run `go vet ./...`.
4. Run `go test ./... -race`.
5. Build `./cmd/api`.

Frontend verification:

1. Set up the Node.js major version used by the frontend Dockerfile.
2. Run `npm ci --ignore-scripts`.
3. Run `npm test`.
4. Run `npm run build` with a safe CI publishable-key placeholder when a real
   production value is not needed.

Deployment asset verification:

1. Validate shell syntax for deployment and smoke-test scripts.
2. Render the production Compose configuration using non-secret placeholder
   values.
3. Build both production Docker images on pull requests without publishing
   them.

Workflow permissions default to `contents: read`. Docker Hub credentials are
not exposed to pull-request jobs.

## Image Publishing

Only a successful push to `main` may publish images.

GitHub repository configuration:

- Variable `DOCKERHUB_USERNAME`.
- Secret `DOCKERHUB_TOKEN` with the minimum Docker Hub permission needed to
  push the two Balanja repositories.
- Production environment secret `VITE_CLERK_PUBLISHABLE_KEY`.

The workflow uses Docker Buildx and GitHub Actions cache. Each image receives
the full commit SHA tag and OCI source/revision labels. An optional `main` tag
may be published for operator convenience, but production Compose never
references it.

The frontend publishable key is embedded at image build time because Vite
produces static browser assets. It is not treated as a private runtime secret.

## Server Runtime Configuration

`/opt/balanja/.env` is created manually during bootstrap, owned by the deployment
user, and mode `0600`. It contains:

- `SITE_ADDRESS=pos.marvcore.com`
- `DATABASE_URL`
- `CLERK_ISSUER_URL`
- `CLERK_AUDIENCE`
- `ALLOWED_ORIGINS=https://pos.marvcore.com`
- `DB_MAX_CONNS`
- `SHUTDOWN_TIMEOUT`
- Cloudflare R2 values when R2 is enabled.

`/opt/balanja/.release.env` is also mode `0600` and contains only:

- `API_IMAGE=<dockerhub-username>/balanja-api:<initial-sha>`
- `WEB_IMAGE=<dockerhub-username>/balanja-web:<initial-sha>`

The Compose file passes only backend runtime values to the API container.
Caddy receives `SITE_ADDRESS`, publishes ports 80 and 443, and retains its
certificate/configuration data in named Docker volumes.

The Tencent Cloud Security Group permits inbound TCP 22, 80, and 443. The DNS A
record for `pos.marvcore.com` points to the server public IP before the first
HTTPS verification.

## Docker Hub Authentication

GitHub Actions authenticates with the write-capable CI token only while
publishing.

For private repositories, the deployment user logs in to Docker Hub during
server bootstrap using a separate read-only access token through
`docker login --password-stdin`. The resulting Docker credential file is
readable only by that user. Public repositories do not require a persistent
server credential, but authenticated pulls are still preferred to avoid
anonymous pull limits.

The CI write token is never copied to the server.

## SSH Security

The GitHub `production` environment stores:

- `DEPLOY_HOST`
- `DEPLOY_PORT` when SSH does not use port 22
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`
- `DEPLOY_KNOWN_HOSTS`

The workflow uses strict host-key checking with the pinned value in
`DEPLOY_KNOWN_HOSTS`. Password authentication and direct root deployment are
not part of the design. The SSH private key is dedicated to this deployment.

GitHub environment protection rules may require approval before production
deployment without changing the workflow.

## Deployment Flow

Production deployments use a concurrency group with cancellation disabled so a
new push cannot interrupt a release already modifying the server.

The deploy job:

1. Confirms the target images exist in Docker Hub.
2. Opens an SSH session with strict host verification.
3. Acquires an exclusive server-side deployment lock.
4. Reads the current verified SHA, if present.
5. Pulls both candidate SHA-tagged images before changing the running stack.
6. Atomically replaces `.release.env` with the candidate `API_IMAGE` and
   `WEB_IMAGE` values without rewriting application secrets.
7. Runs `docker compose up -d` and waits for service health within a bounded
   timeout.
8. Runs the local smoke test against the reverse proxy.
9. Runs an external smoke test against `https://pos.marvcore.com`.
10. Records the old SHA as `previous` and the candidate SHA as `current`.
11. Prunes only safe, unused Docker build/image data after success.

The stack is updated in place. It does not run `docker compose down`, so Caddy
volumes and unrelated Docker workloads remain intact.

## Health Checks

A release is healthy only if:

- The API container reports healthy through `/readyz`.
- `/healthz` and `/readyz` return success through Caddy.
- An unauthenticated request to `/api/v1/products` returns `401`.
- The frontend root contains the expected React mount element.
- The public HTTPS endpoint passes the same checks after DNS/TLS is available.

Health checks have explicit connection and overall timeouts so a stalled
request cannot block the deployment indefinitely.

## Rollback

If Compose startup or either smoke test fails:

1. Restore the previous `.release.env` image references atomically.
2. Pull the previous images if they are not present locally.
3. Run `docker compose up -d` with the previous versions.
4. Run the local smoke test again.
5. Exit the deployment with failure so GitHub reports the rejected release.

The failed candidate never replaces `.deploy/current`. If no previous verified
release exists, the first deployment fails without pretending rollback
succeeded and requires operator intervention.

Rollback affects application images only. Automatic database migration is
excluded, so an image rollback cannot be made unsafe by an implicit destructive
schema change.

## Failure Handling and Recovery

- Image publication failure prevents deployment.
- SSH or host-key failure leaves the running stack unchanged.
- Candidate image pull failure occurs before active image references change.
- Deployment locking prevents GitHub and a manual operator from deploying
  concurrently.
- A failed rollback is reported distinctly and includes commands for inspecting
  `docker compose ps` and service logs.
- Manual rollback accepts an explicit previously published commit SHA and uses
  the same deployment script and verification path.

## Repository Changes

Implementation is expected to add or update:

- `.github/workflows/ci-cd.yml`
- `deploy/compose.production.yaml`
- `deploy/deploy.sh`
- `deploy/bootstrap-server.sh`
- `deploy/smoke.sh`
- `docs/deployment.md`
- Relevant environment examples and ignore rules

Existing source files and the developer's uncommitted feature work are outside
the deployment change and must not be overwritten.

## Acceptance Criteria

- Pull requests to `main` run backend, frontend, Compose, shell, and image-build
  validation without accessing production secrets.
- A successful push to `main` publishes both SHA-tagged Docker Hub images.
- Only verified images are recorded as the active production release.
- A failed candidate automatically restores the previous verified images.
- Runtime secrets remain on the Tencent Cloud server and are absent from Git.
- HTTPS serves Balanja at `https://pos.marvcore.com`.
- The operator guide documents first deploy, GitHub/Docker Hub configuration,
  logs, manual rollback, and credential rotation.
