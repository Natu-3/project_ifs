#!/usr/bin/env sh
set -eu

# Usage:
#   ./runbook/deploy-ec2.sh <sha-or-tag>
# Examples:
#   ./runbook/deploy-ec2.sh 1a2b3c4
#   ./runbook/deploy-ec2.sh sha-1a2b3c4
#   ./runbook/deploy-ec2.sh latest

TAG="${1:-}"
[ -n "$TAG" ] || { echo "Usage: $0 <sha-or-tag>"; exit 1; }

case "$TAG" in
  latest|sha-*) ;;
  *) TAG="sha-$TAG" ;;
esac

OWNER="${OWNER:-natu-3}"
BACKEND_REPO="${BACKEND_REPO:-project_ifs-backend}"
FRONTEND_REPO="${FRONTEND_REPO:-project_ifs-frontend}"
AI_REPO="${AI_REPO:-project_ifs-ai}"

command -v docker >/dev/null 2>&1 || { echo "docker not found"; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "docker compose not found"; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "curl not found"; exit 1; }
[ -f docker-compose.prod.yml ] || { echo "docker-compose.prod.yml not found in $(pwd)"; exit 1; }
[ -f .env.prod ] || { echo ".env.prod not found in $(pwd)"; exit 1; }

if [ -n "${GHCR_USERNAME:-}" ] && [ -n "${GHCR_PAT:-}" ]; then
  echo "$GHCR_PAT" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
fi

BACKEND_IMAGE="ghcr.io/$OWNER/$BACKEND_REPO:$TAG"
FRONTEND_IMAGE="ghcr.io/$OWNER/$FRONTEND_REPO:$TAG"
PYTHON_API_IMAGE="ghcr.io/$OWNER/$AI_REPO:$TAG"

cp .env.prod .env.runtime
cat >> .env.runtime <<EOF
BACKEND_IMAGE=$BACKEND_IMAGE
FRONTEND_IMAGE=$FRONTEND_IMAGE
PYTHON_API_IMAGE=$PYTHON_API_IMAGE
EOF

docker compose --env-file .env.runtime -f docker-compose.prod.yml pull
docker compose --env-file .env.runtime -f docker-compose.prod.yml up -d --remove-orphans

BACKEND_OK=0
for i in $(seq 1 24); do
  if curl -fsS "http://localhost:8081/actuator/health" >/dev/null; then
    BACKEND_OK=1
    break
  fi
  sleep 5
done

PYTHON_OK=0
for i in $(seq 1 24); do
  if curl -fsS "http://localhost:8000/chat-api/v1/health" >/dev/null; then
    PYTHON_OK=1
    break
  fi
  sleep 5
done

if [ "$BACKEND_OK" -ne 1 ] || [ "$PYTHON_OK" -ne 1 ]; then
  echo "Health check failed"
  docker compose --env-file .env.runtime -f docker-compose.prod.yml ps || true
  docker logs ifs-backend --tail 200 || true
  docker logs ifs-python-api --tail 200 || true
  exit 1
fi

if [ -f .current_tag ]; then
  cp .current_tag .prev_tag
fi
echo "$TAG" > .current_tag
echo "$TAG" > .last_success_tag

echo "Deploy success: $TAG"
