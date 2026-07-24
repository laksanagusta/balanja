#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "run this script as root or with sudo" >&2
  exit 77
fi

deploy_user="${1:-balanja-deploy}"
app_dir="${APP_DIR:-/opt/balanja}"

if [[ ! "$deploy_user" =~ ^[a-z_][a-z0-9_-]*[$]?$ ]]; then
  echo "invalid deployment user" >&2
  exit 64
fi

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
if ! getent group docker >/dev/null; then
  groupadd docker
fi
usermod -aG docker "$deploy_user"
install -d -m 0750 -o "$deploy_user" -g "$deploy_user" "$app_dir"
install -d -m 0750 -o "$deploy_user" -g "$deploy_user" "$app_dir/.deploy"
systemctl enable --now docker

echo "server bootstrap complete for $deploy_user"
echo "start a new login session before testing Docker group access"
