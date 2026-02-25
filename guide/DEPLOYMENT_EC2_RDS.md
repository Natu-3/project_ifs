# EC2 + RDS 프로덕션 배포 가이드

## 범위
- CI는 `main` 브랜치 push 시 이미지를 빌드하고 GHCR에 push합니다.
- CD(배포/롤백 트리거)는 EC2에서만 실행합니다.
- 프라이빗 RDS MySQL 8.0.x를 사용하고 `JPA_DDL_AUTO=validate`를 사용합니다.
- 프로덕션 배포 전에 `runbook/MAIN_EC2_RDS_PREDEPLOY_GATE_CHECKLIST.md`의 게이트 체크리스트를 따르세요.

## AWS 사전 준비 사항
1. 프라이빗 서브넷에 RDS MySQL 8.0을 생성합니다.
2. EC2 보안 그룹에서만 `3306` 접근을 허용하는 RDS 보안 그룹을 연결합니다.
3. EC2를 동일한 VPC에 두고 인바운드 `22`, `80`, `443`을 허용합니다.
4. EC2에 Docker와 Docker Compose 플러그인을 설치합니다.
5. 이 저장소를 EC2의 고정 경로(예: `/srv/project_ifs`)에 클론합니다.

## 필수 GitHub Secrets (CI 전용)
- CI에는 EC2 SSH 시크릿이 필요하지 않습니다.
- Actions에서 GHCR push는 기본 `GITHUB_TOKEN`만으로 충분합니다.

## EC2 필수 런타임 입력값
- 저장소 루트에 `.env.prod` 파일 필요 (DB/앱 설정; `.env.prod.example`을 템플릿으로 사용).
- `DB_HOST`는 RDS 엔드포인트로 설정합니다 (AWS 프로덕션에서는 compose의 `db` 서비스를 사용하지 마세요).
- 프라이빗 이미지 pull을 위한 EC2의 GHCR 인증:
  - 옵션 A: `docker login ghcr.io`를 1회 실행하고 Docker 설정을 재사용.
  - 옵션 B: 스크립트 실행 전에 `GHCR_USERNAME`, `GHCR_PAT` 환경 변수를 설정.

## CI 흐름 (GitHub Actions)
1. `main`에 push합니다.
2. 워크플로 `.github/workflows/ghcr-build.yml`이 빌드 및 push를 수행합니다:
   - `ghcr.io/natu-3/project_ifs-backend:sha-<short>` (+ `latest`)
   - `ghcr.io/natu-3/project_ifs-frontend:sha-<short>` (+ `latest`)
   - `ghcr.io/natu-3/project_ifs-ai:sha-<short>` (+ `latest`)

## CD 흐름 (EC2 수동 트리거)
EC2의 저장소 루트에서 실행:

```bash
chmod +x runbook/deploy-ec2.sh runbook/rollback-ec2.sh runbook/auto-deploy-latest.sh
./runbook/deploy-ec2.sh <short_sha>
```

롤백:

```bash
./runbook/rollback-ec2.sh
# 또는
./runbook/rollback-ec2.sh sha-abcdef1
```

## CD 흐름 (systemd timer를 이용한 EC2 자동 트리거)
1. 유닛 파일 복사 후 데몬 리로드:

```bash
sudo mkdir -p /etc/project_ifs
sudo cp runbook/systemd/project-ifs-autodeploy.service /etc/systemd/system/
sudo cp runbook/systemd/project-ifs-autodeploy.timer /etc/systemd/system/
sudo systemctl daemon-reload
```

2. GHCR 로그인을 위한 선택적 시크릿 환경 파일 (`/etc/project_ifs/auto-deploy.env`):

```bash
sudo tee /etc/project_ifs/auto-deploy.env >/dev/null <<'EOF'
GHCR_USERNAME=<github_username>
GHCR_PAT=<ghcr_pat_with_read_packages>
# OWNER=natu-3
# WATCH_TAG=latest
EOF
sudo chmod 600 /etc/project_ifs/auto-deploy.env
```

3. 타이머 활성화:

```bash
sudo systemctl enable --now project-ifs-autodeploy.timer
sudo systemctl status project-ifs-autodeploy.timer
```

4. 실행 로그 확인:

```bash
sudo journalctl -u project-ifs-autodeploy.service -n 100 --no-pager
```

참고:
- 기본 실행 간격은 3분마다입니다 (`runbook/systemd/project-ifs-autodeploy.timer`).
- 자동 배포는 GHCR `latest` digest가 변경된 경우에만 실행됩니다.

## 검증 체크리스트
1. `docker ps`에서 `ifs-frontend`, `ifs-backend`, `ifs-python-api`, `ifs-redis`가 실행 중이어야 합니다.
2. 백엔드 헬스 엔드포인트 `http://localhost:8081/actuator/health`가 `UP`를 반환해야 합니다.
3. Python 헬스 엔드포인트 `http://localhost:8000/chat-api/v1/health`가 `status=ok`를 반환해야 합니다.
4. 로그인, 일정 CRUD, 팀 캘린더 동기화, 채팅 API 플로우가 모두 정상 동작해야 합니다.
