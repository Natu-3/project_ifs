# EC2 + RDS Production Deployment Guide

## Scope
- CI builds and pushes images to GHCR on `main` push.
- CD (deploy/rollback trigger) runs only from EC2.
- Use private RDS MySQL 8.0.x and `JPA_DDL_AUTO=validate`.
- Follow the gate checklist in `runbook/MAIN_EC2_RDS_PREDEPLOY_GATE_CHECKLIST.md` before production deploy.

## AWS Prerequisites
1. Create RDS MySQL 8.0 in a private subnet.
2. Attach an RDS security group allowing `3306` from EC2 security group only.
3. Place EC2 in the same VPC and allow inbound `22`, `80`, `443`.
4. Install Docker and Docker Compose plugin on EC2.
5. Clone this repository on EC2 to a fixed path (example: `/srv/project_ifs`).

## Required GitHub Secrets (CI only)
- No EC2 SSH secrets are required for CI.
- Default `GITHUB_TOKEN` is enough for GHCR push from Actions.

## EC2 Required Runtime Inputs
- `.env.prod` in repository root (DB/app settings; use `.env.prod.example` as template).
- Set `DB_HOST` to the RDS endpoint (do not use the compose `db` service in AWS production).
- GHCR auth on EC2 for private pulls:
  - Option A: `docker login ghcr.io` once and reuse docker config.
  - Option B: set `GHCR_USERNAME`, `GHCR_PAT` env vars before running scripts.

## CI Flow (GitHub Actions)
1. Push to `main`.
2. Workflow `.github/workflows/ghcr-build.yml` builds and pushes:
   - `ghcr.io/natu-3/project_ifs-backend:sha-<short>` (+ `latest`)
   - `ghcr.io/natu-3/project_ifs-frontend:sha-<short>` (+ `latest`)
   - `ghcr.io/natu-3/project_ifs-ai:sha-<short>` (+ `latest`)

## CD Flow (EC2 Manual Trigger)
From repo root on EC2:

```bash
chmod +x runbook/deploy-ec2.sh runbook/rollback-ec2.sh runbook/auto-deploy-latest.sh
./runbook/deploy-ec2.sh <short_sha>
```

Rollback:

```bash
./runbook/rollback-ec2.sh
# or
./runbook/rollback-ec2.sh sha-abcdef1
```

## CD Flow (EC2 Auto Trigger with systemd timer)
1. Copy unit files and reload daemon:

```bash
sudo mkdir -p /etc/project_ifs
sudo cp runbook/systemd/project-ifs-autodeploy.service /etc/systemd/system/
sudo cp runbook/systemd/project-ifs-autodeploy.timer /etc/systemd/system/
sudo systemctl daemon-reload
```

2. Optional secret env file for GHCR login (`/etc/project_ifs/auto-deploy.env`):

```bash
sudo tee /etc/project_ifs/auto-deploy.env >/dev/null <<'EOF'
GHCR_USERNAME=<github_username>
GHCR_PAT=<ghcr_pat_with_read_packages>
# OWNER=natu-3
# WATCH_TAG=latest
EOF
sudo chmod 600 /etc/project_ifs/auto-deploy.env
```

3. Enable timer:

```bash
sudo systemctl enable --now project-ifs-autodeploy.timer
sudo systemctl status project-ifs-autodeploy.timer
```

4. Check execution logs:

```bash
sudo journalctl -u project-ifs-autodeploy.service -n 100 --no-pager
```

Notes:
- Default interval is every 3 minutes (`runbook/systemd/project-ifs-autodeploy.timer`).
- Auto deploy runs only when GHCR `latest` digest changed.

## Verification Checklist
1. `docker ps` shows `ifs-frontend`, `ifs-backend`, `ifs-python-api`, `ifs-redis` running.
2. Backend health endpoint returns `UP` from `http://localhost:8081/actuator/health`.
3. Python health endpoint returns `status=ok` from `http://localhost:8000/chat-api/v1/health`.
4. Login, schedule CRUD, team calendar sync, chat API flow all work.
