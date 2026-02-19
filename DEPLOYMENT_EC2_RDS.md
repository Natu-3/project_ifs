# EC2 + RDS Production Deployment Guide

## Scope
- Deploy `main` branch images to EC2 automatically through GitHub Actions.
- Use private RDS MySQL 8.0.x instead of containerized MySQL.
- Keep production schema policy as `JPA_DDL_AUTO=validate`.

## AWS Prerequisites
1. Create RDS MySQL 8.0 in a private subnet.
2. Attach an RDS security group allowing `3306` from EC2 security group only.
3. Place EC2 in the same VPC and allow inbound `22`, `80`, `443`.
4. Install Docker and Docker Compose plugin on EC2.
5. Clone this repository on EC2 to a fixed path (example: `/srv/project_ifs`).

## Required GitHub Secrets
- `EC2_HOST`
- `EC2_USER`
- `EC2_SSH_KEY`
- `EC2_SSH_PORT` (example: `22`)
- `EC2_APP_DIR` (example: `/srv/project_ifs`)
- `GHCR_USERNAME`
- `GHCR_PAT` (`read:packages` scope)
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (example: `gpt-4.1-mini`)
- `CHAT_RETENTION_DAYS` (example: `30`)
- `RATE_LIMIT_PER_MINUTE` (example: `20`)

## Local Template
Use `.env.prod.example` as the canonical production template.

## Deployment Flow
1. Push to `main`.
2. Workflow `.github/workflows/ghcr-build.yml` builds and pushes three images:
   - `ghcr.io/natu-3/project_ifs-backend`
   - `ghcr.io/natu-3/project_ifs-frontend`
   - `ghcr.io/natu-3/project_ifs-ai`
3. Workflow deploys to EC2 with `sha-<short>` immutable tags.
4. Workflow rewrites `.env.prod` on EC2 from GitHub Secrets.
5. Workflow executes:
   - `docker compose --env-file .env.prod -f docker-compose.prod.yml pull`
   - `docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --remove-orphans`
6. Workflow health checks:
   - `http://localhost:8081/actuator/health`
   - `http://localhost:8000/chat-api/v1/health`

## Rollback
- If deploy fails, workflow automatically attempts rollback to previous commit SHA image tags.
- Rollback rewrites `.env.prod` with previous immutable tags and re-runs compose up.

## Schema Policy
- Spring backend: `JPA_DDL_AUTO=validate` in production.
- Python API: Alembic migration runs at container startup (`alembic upgrade head`).
- For schema changes, add migration first, then deploy.

## Verification Checklist
1. `docker ps` shows `ifs-frontend`, `ifs-backend`, `ifs-python-api`, `ifs-redis` running.
2. Backend health endpoint returns `UP`.
3. Python health endpoint returns `status=ok`.
4. Login and schedule CRUD work.
5. Team calendar sync and chat API flow work.
