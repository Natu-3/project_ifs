# `main` AWS EC2(RDS) Pre-Deploy Gate Checklist

## Purpose
- Prevent production deploy failures for `main` by checking build, image, EC2 runtime, env/secret contract, and runtime health in a fixed gate order.
- Prioritize historical failure patterns: hardcoded secrets, inconsistent env names, missing runtime values.

## Fixed Policy (Do Not Override During Execution)
- Scope: build + deploy end-to-end (CI image build/push -> EC2 deploy -> health -> smoke)
- Production DB target: AWS RDS (not the compose `db` container)
- Production DB policy: `JPA_DDL_AUTO=validate`
- Execution mode: gate-based, stop on first `FAIL`
- Evidence mode: record command, result summary, and key logs for each item

## Stop Rule
- If any item is `FAIL`, stop at the current gate.
- Record evidence and root-cause category.
- Fix and rerun the same gate before continuing.

## Result Codes
- `PASS`: matched expected result
- `FAIL`: mismatch / error / policy violation
- `BLOCKED`: cannot verify yet due to missing access or dependency
- `N/A`: intentionally skipped (must include reason)

## Evidence Record Template (Copy Per Item)
| Gate | Item | Command / Check Method | Expected | Actual Result Summary | Verdict | Evidence (1-3 lines) | Root Cause Category | Next Action |
|---|---|---|---|---|---|---|---|---|
| Gx |  |  |  |  | PASS/FAIL/BLOCKED/N/A |  | env/secret, network, image, app-config, dependency, unknown |  |

## Gate 0. Baseline Alignment (Docs / Policy)
Purpose: lock the production rules before technical checks.

### Items
- [ ] Confirm production target is `RDS` (not compose `db`)
- [ ] Confirm production policy `JPA_DDL_AUTO=validate`
- [ ] Confirm team understands compose `db` service is local/demo fallback only
- [ ] Confirm `.env.prod.example` is treated as template, not production values

### Primary Evidence Sources
- `DEPLOYMENT_EC2_RDS.md`
- `runbook/EC2_RDS_RUNBOOK_TEMPLATE.md`
- `docker-compose.prod.yml`
- `.env.prod.example`

### Fail Signals
- Docs say RDS/validate, but runtime env or compose defaults imply otherwise
- Team deploy procedure depends on compose `db` in AWS production

## Gate 1. Secret / Env Contract (Highest Priority)
Purpose: catch missing or inconsistent runtime config before image pull and startup.

### Required Runtime Contract (EC2 `.env.prod`)
- [ ] `DB_HOST` (RDS endpoint)
- [ ] `DB_PORT`
- [ ] `DB_NAME`
- [ ] `DB_USER`
- [ ] `DB_PASSWORD`
- [ ] `JPA_DDL_AUTO=validate`
- [ ] `SPRING_PROFILES_ACTIVE=prod`
- [ ] `APP_CORS_ALLOWED_ORIGINS` (production domain, not localhost)
- [ ] `OPENAI_API_KEY` (if chat feature enabled)
- [ ] `OPENAI_MODEL`
- [ ] `CHAT_RETENTION_DAYS`
- [ ] `RATE_LIMIT_PER_MINUTE`

### Image Tag Input Contract
- [ ] `BACKEND_IMAGE`, `FRONTEND_IMAGE`, `PYTHON_API_IMAGE` exist in `.env.prod`, or
- [ ] `runbook/deploy-ec2.sh <sha>` path is used and `.env.runtime` generation is verified

### Naming Consistency Checks
- [ ] `DB_USER` / `DB_PASSWORD` names are consistent across compose, backend, python_api, docs
- [ ] No leftover `${DB_USER}` / `${DB_PASSWORD}` string appears in runtime logs when starting app

### Policy Checks
- [ ] No production fallback for `DB_USER` / `DB_PASSWORD`
- [ ] `root` DB account usage is explicitly approved (temporary) or replaced with app-specific user
- [ ] `APP_CORS_ALLOWED_ORIGINS` localhost fallback is not used in production

### Fail Signals
- `${DB_USER}` literal appears in logs
- `DB_PASSWORD` missing causes DB healthcheck failure
- `OPENAI_API_KEY` missing causes unexpected startup failure
- CORS origin still `http://localhost:3000` in production

## Gate 2. CI Build & GHCR Tag Verification (`main`)
Purpose: verify deployable artifacts exist and are consistent before EC2 deploy.

### Checks
- [ ] GitHub Actions workflow `.github/workflows/ghcr-build.yml` still builds on `main`
- [ ] Tag pattern includes both `latest` and `sha-<short_sha>` for all 3 images
- [ ] GHCR contains matching `sha-<short_sha>` tags for:
  - [ ] `project_ifs-backend`
  - [ ] `project_ifs-frontend`
  - [ ] `project_ifs-ai`
- [ ] All 3 images use the same deployment SHA
- [ ] Build success is not misread as app validation success (tests/config checks tracked separately)

### Evidence to Record
- Deployment target short SHA
- Actions run number / timestamp (if available)
- GHCR tag existence result per image

### Fail Signals
- Only `latest` exists
- One image missing `sha-*` tag
- Mixed SHA across services

## Gate 3. Pre-Deploy App Validation (Local / Preflight)
Purpose: detect known app-level config regressions before EC2 deployment.

### Backend (`backwork`)
- [ ] Test run strategy is defined (env injection, test profile, H2/Testcontainers, or documented known block)
- [ ] `DB_USER` / `DB_PASSWORD` provided for tests when DB-backed tests are executed
- [ ] No Spring placeholder literal (`${DB_USER}`) is used at runtime/test startup

### Python API (`python_api`)
- [ ] Dependency installation prerequisite documented (`pydantic_settings` etc.)
- [ ] Minimal config load validation procedure documented
- [ ] `DB_*` and `OPENAI_*` env behavior (present/missing) understood

### Frontend (`reactwork`)
- [ ] Build success verified for target change set (or recent CI result reused with evidence)

### Known Historical Failure to Recheck
- [ ] `runbook/build-validation-failures-2026-02-22.txt` issue (`${DB_USER}` unresolved) is prevented by current procedure

### Fail Signals
- Test/config validation skipped without reason
- Python validation result invalid due to missing deps but treated as pass
- Backend test repeats unresolved env placeholder failure

## Gate 4. EC2 Runtime Readiness
Purpose: verify host tools, auth, env file, and RDS network assumptions before deploy execution.

### Host Tooling
- [ ] `docker` available
- [ ] `docker compose` available
- [ ] `curl` available

### Files in EC2 App Directory
- [ ] `docker-compose.prod.yml`
- [ ] `.env.prod`
- [ ] `runbook/deploy-ec2.sh`
- [ ] `runbook/rollback-ec2.sh`

### GHCR Pull Authentication
- [ ] Existing `docker login ghcr.io` session works, or
- [ ] `GHCR_USERNAME` + `GHCR_PAT` exported for deploy run

### `.env.prod` Content Checks (mask secrets)
- [ ] `DB_HOST` points to RDS endpoint (not `db`)
- [ ] `JPA_DDL_AUTO=validate`
- [ ] `APP_CORS_ALLOWED_ORIGINS` uses production domain
- [ ] `DB_USER`, `DB_PASSWORD`, `OPENAI_API_KEY` present (masked evidence only)

### RDS Network Preconditions
- [ ] EC2 and RDS in same VPC (or routed correctly)
- [ ] RDS SG inbound `3306` allows EC2 SG
- [ ] Route/subnet assumptions confirmed

### Fail Signals
- `deploy-ec2.sh` prerequisite tools missing
- GHCR auth fails on private pull
- `.env.prod` points DB host to `db` instead of RDS
- SG/network blocks DB connect

## Gate 5. Deploy Execution Verification (`runbook/deploy-ec2.sh`)
Purpose: validate the deploy script flow and capture failure evidence at the exact failing step.

### Script Flow Checks (in order)
- [ ] Tag normalization works (`abcdef1` -> `sha-abcdef1`)
- [ ] GHCR login branch runs only when `GHCR_USERNAME` and `GHCR_PAT` provided
- [ ] Runtime image variables resolve correctly:
  - [ ] `BACKEND_IMAGE`
  - [ ] `FRONTEND_IMAGE`
  - [ ] `PYTHON_API_IMAGE`
- [ ] `.env.runtime` generated from `.env.prod` without bad overrides
- [ ] `docker compose pull` succeeds
- [ ] `docker compose up -d --remove-orphans` succeeds
- [ ] Backend health loop passes (`:8081/actuator/health`)
- [ ] Python API health loop passes (`:8000/chat-api/v1/health`)
- [ ] On failure, logs are captured (`ps`, backend logs, python_api logs)
- [ ] On success, tag state files update (`.prev_tag`, `.current_tag`, `.last_success_tag`)

### Fail Signals
- Pull fails (GHCR auth / tag missing)
- Up fails (env missing / port conflict / startup crash)
- Health timeout due to DB connect or app config issue
- `.env.runtime` appends conflicting values unexpectedly

## Gate 6. Runtime Health & Smoke Tests
Purpose: confirm actual functionality, not just container startup.

### Container State
- [ ] `ifs-frontend` running
- [ ] `ifs-backend` running
- [ ] `ifs-python-api` running
- [ ] `ifs-redis` running

### Health Endpoints
- [ ] Backend health returns `UP`
- [ ] Python health returns expected healthy payload

### Smoke Tests (Priority Order)
- [ ] Login
- [ ] Schedule CRUD
- [ ] Team calendar sync
- [ ] Chat API

### Chat API Special Check
- [ ] If `OPENAI_API_KEY` missing/invalid, failure mode is expected and isolated (not silent/pass)

### Fail Signals
- Health endpoints pass but functional flow fails (CORS, service integration, external API)
- Frontend appears normal but backend/python logs show runtime errors

## Gate 7. Rollback Readiness
Purpose: ensure fast recovery path before/after production deploy.

### Checks
- [ ] `runbook/rollback-ec2.sh` exists and executable
- [ ] `.prev_tag` exists after at least one successful deploy, or manual rollback tag is known
- [ ] Previous stable SHA is recorded somewhere accessible
- [ ] Rollback health + smoke verification steps are ready (same Gate 6 checks)

### Fail Signals
- No rollback target known
- Previous image tag no longer available in GHCR
- Rollback can run but no validation procedure exists

## Priority Risk Review List (Review in this Order)
### P0 (Blocker)
- Missing or inconsistent env/secret (`DB_USER`, `DB_PASSWORD`, `OPENAI_API_KEY`)
- Production policy mismatch (`JPA_DDL_AUTO!=validate`)
- GHCR auth/tag failure
- RDS connectivity (SG/VPC/endpoint/credential)
- Backend/Python health failures

### P1 (High)
- `APP_CORS_ALLOWED_ORIGINS` incorrect for production domain
- `OPENAI_API_KEY` missing behavior unclear
- Preflight validation unreliable due to missing test env/deps
- Docs/compose mismatch causes wrong deployment path (compose `db` in AWS prod)

### P2 (Cleanup / Prevention)
- Example/document fallback values causing confusion
- Secret scan noise from sample/archived files
- Inconsistent checklist evidence formatting

## Failure Scenario Drills (Recommended)
- [ ] Missing `DB_USER` or `DB_PASSWORD` -> verify detection/classification
- [ ] Missing `OPENAI_API_KEY` -> verify expected failure behavior
- [ ] Invalid `sha-*` tag -> verify pull failure and recovery path
- [ ] RDS SG block -> verify network classification
- [ ] `JPA_DDL_AUTO=update` in `.env.prod` -> verify Gate 1/4 policy block

## Post-Run Output (What to Keep)
- [ ] Completed checklist with evidence for each gate
- [ ] Final verdict: `READY` / `NOT READY`
- [ ] Root causes found (if any) with category
- [ ] Follow-up actions:
  - [ ] Env contract standardization
  - [ ] Test env injection procedure for backend
  - [ ] Python preflight dependency/setup validation
  - [ ] Doc/example alignment for RDS + `validate`
