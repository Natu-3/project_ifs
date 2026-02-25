#!/usr/bin/env sh
set -eu

# Auto deploy runner for EC2.
# It checks latest image digests from GHCR and deploys only when they changed.

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
APP_DIR="${APP_DIR:-$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)}"
STATE_FILE="${STATE_FILE:-$APP_DIR/.last_auto_deploy_digests}"
WATCH_TAG="${WATCH_TAG:-latest}"

OWNER="${OWNER:-natu-3}"
BACKEND_REPO="${BACKEND_REPO:-project_ifs-backend}"
FRONTEND_REPO="${FRONTEND_REPO:-project_ifs-frontend}"
AI_REPO="${AI_REPO:-project_ifs-ai}"

cd "$APP_DIR"

command -v docker >/dev/null 2>&1 || { echo "docker not found"; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "docker compose not found"; exit 1; }

if [ -n "${GHCR_USERNAME:-}" ] && [ -n "${GHCR_PAT:-}" ]; then
  echo "$GHCR_PAT" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
fi

backend_image="ghcr.io/$OWNER/$BACKEND_REPO:$WATCH_TAG"
frontend_image="ghcr.io/$OWNER/$FRONTEND_REPO:$WATCH_TAG"
python_image="ghcr.io/$OWNER/$AI_REPO:$WATCH_TAG"

resolve_digest() {
  image="$1"
  docker pull "$image" >/dev/null
  digest="$(docker image inspect "$image" --format '{{index .RepoDigests 0}}' 2>/dev/null || true)"
  if [ -z "$digest" ]; then
    digest="$(docker image inspect "$image" --format '{{.Id}}')"
  fi
  printf '%s' "$digest"
}

backend_digest="$(resolve_digest "$backend_image")"
frontend_digest="$(resolve_digest "$frontend_image")"
python_digest="$(resolve_digest "$python_image")"

new_state="$backend_digest|$frontend_digest|$python_digest"
old_state=""
if [ -f "$STATE_FILE" ]; then
  old_state="$(cat "$STATE_FILE")"
fi

if [ "$new_state" = "$old_state" ]; then
  echo "No image change detected for tag: $WATCH_TAG"
  exit 0
fi

"$SCRIPT_DIR/deploy-ec2.sh" "$WATCH_TAG"
printf '%s\n' "$new_state" > "$STATE_FILE"

echo "Auto deploy completed. Tag: $WATCH_TAG"
