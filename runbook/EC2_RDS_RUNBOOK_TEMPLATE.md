# EC2 + RDS Deployment Runbook Template (Team)

## Purpose
- This document is a team-shared deployment template for EC2 + RDS operations.
- Do not put raw secrets in this file.

## Scope
- Deployment target:
  - `frontend`
  - `backend`
  - `python_api`
  - `redis`
- Database: RDS MySQL 8.0.x (private)
- Registry: GHCR (private)

## Environment Summary
- AWS Region: `<REGION>`
- VPC: `<VPC_NAME_OR_ID>`
- EC2 Host Group: `<EC2_NAME_OR_ASG>`
- RDS Instance: `<RDS_IDENTIFIER>`
- App Directory on EC2: `<EC2_APP_DIR>`

## Security Baseline
- RDS SG inbound `3306` allowed from EC2 SG only.
- EC2 inbound only required ports (`22`, `80`, `443`).
- Secrets are stored in a secret manager, not in Git.
- Production DB policy: `JPA_DDL_AUTO=validate`.

## Required Secrets Checklist
- [ ] `EC2_HOST`
- [ ] `EC2_USER`
- [ ] `EC2_SSH_KEY`
- [ ] `EC2_SSH_PORT`
- [ ] `EC2_APP_DIR`
- [ ] `GHCR_USERNAME`
- [ ] `GHCR_PAT` (`read:packages`)
- [ ] `DB_HOST`
- [ ] `DB_PORT`
- [ ] `DB_NAME`
- [ ] `DB_USER`
- [ ] `DB_PASSWORD`
- [ ] `OPENAI_API_KEY`
- [ ] `OPENAI_MODEL`
- [ ] `CHAT_RETENTION_DAYS`
- [ ] `RATE_LIMIT_PER_MINUTE`

## One-time Setup
1. Install Docker and Docker Compose plugin on EC2.
2. Clone repository to `<EC2_APP_DIR>`.
3. Login to GHCR from EC2.
4. Prepare `.env.prod` using secure values.
5. Confirm `docker-compose.prod.yml` is present.

## Standard Deployment Procedure
1. Merge changes into `main`.
2. Confirm CI built/pushed immutable `sha-*` image tags.
3. On EC2:
   - `docker compose --env-file .env.prod -f docker-compose.prod.yml pull`
   - `docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --remove-orphans`
4. Verify health:
   - `curl -fsS http://localhost:8081/actuator/health`
   - `curl -fsS http://localhost:8000/chat-api/v1/health`
5. Run smoke tests:
   - Login
   - Schedule CRUD
   - Team calendar sync
   - Chat API

## Rollback Procedure
1. Identify previous stable SHA tag.
2. Update `.env.prod` image tags to previous SHA:
   - `BACKEND_IMAGE`
   - `FRONTEND_IMAGE`
   - `PYTHON_API_IMAGE`
3. Re-run:
   - `docker compose --env-file .env.prod -f docker-compose.prod.yml pull`
   - `docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --remove-orphans`
4. Re-check health endpoints and smoke tests.

## Migration and DB Rules
- Apply schema changes through migration only.
- Do not use runtime auto-mutation in production.
- Keep RDS automated backup/snapshot enabled.

## Incident Response Notes
- DB connect error:
  - Check SG, route table, subnet, DB credential.
- Deployment failure:
  - Roll back to previous SHA immediately.
- Unknown app error:
  - Collect deploy SHA, container logs, and RDS event logs.

## Change Log
- Date:
- Author:
- Summary:
- Risk:
- Rollback plan:
