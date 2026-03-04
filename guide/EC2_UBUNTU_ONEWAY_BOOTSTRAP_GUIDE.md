# EC2 Ubuntu 원웨이 배포 가이드

이 문서는 EC2(Ubuntu) 인스턴스를 처음 만든 뒤, 다음 순서로 한 번에 배포 가능한 상태까지 만드는 입문 가이드입니다.

1. EC2 기본 설정
2. Git/Docker 설치
3. 저장소 배치
4. GHCR 이미지 Pull 준비
5. CI 확인
6. CD 자동화(systemd timer)
7. Docker 실행/검증/롤백

## 1) AWS 사전 준비

### 1-1. EC2
- OS: Ubuntu 22.04 LTS 또는 24.04 LTS
- 보안그룹 인바운드:
- `22/tcp`: 운영자 IP만 허용
- `80/tcp`, `443/tcp`: 서비스 공개용 허용
- `8081`, `8000`, `6379`: 외부 공개 금지

### 1-2. RDS 사용 시
- RDS Public Access 비활성
- RDS 보안그룹 인바운드 `3306/tcp` 소스는 EC2 보안그룹만 허용

## 2) EC2 접속 후 기본 세팅

```bash
ssh -i <KEY.pem> ubuntu@<EC2_PUBLIC_IP>
```

```bash
sudo apt-get update
sudo apt-get -y upgrade
sudo timedatectl set-timezone Asia/Seoul
sudo apt-get install -y ca-certificates curl gnupg lsb-release jq unzip
```

## 3) Git + Docker + Compose 설치

```bash
sudo apt-get install -y git
git --version
```

```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

```bash
sudo usermod -aG docker $USER
newgrp docker
docker version
docker compose version
```

## 4) 저장소 배치

```bash
sudo mkdir -p /srv
sudo chown -R $USER:$USER /srv
cd /srv
git clone <YOUR_REPO_URL> project_ifs
cd /srv/project_ifs
chmod +x runbook/deploy-ec2.sh runbook/rollback-ec2.sh runbook/auto-deploy-latest.sh
```

## 5) GHCR 인증 준비

GitHub PAT(최소 `read:packages`)를 만든 뒤 EC2에서 로그인합니다.

```bash
echo "<GHCR_PAT>" | docker login ghcr.io -u <GITHUB_USERNAME> --password-stdin
```

## 6) 런타임 환경파일 작성

```bash
cp .env.prod.example .env.prod
nano .env.prod
```

필수 값 예시:

```dotenv
DB_HOST=<RDS_ENDPOINT>
DB_PORT=3306
DB_NAME=ifscm
DB_USER=<APP_DB_USER>
DB_PASSWORD=<STRONG_PASSWORD>

JPA_DDL_AUTO=validate
SPRING_PROFILES_ACTIVE=prod
APP_CORS_ALLOWED_ORIGINS=https://<FRONTEND_DOMAIN>

OPENAI_API_KEY=<OPENAI_KEY>
OPENAI_MODEL=gpt-4.1-mini
CHAT_RETENTION_DAYS=30
RATE_LIMIT_PER_MINUTE=20
```

```bash
chmod 600 .env.prod
```

## 7) CI 확인 (GitHub Actions)

`main` 브랜치 push 시 `.github/workflows/ghcr-build.yml`이 실행되어 GHCR 이미지가 생성되는지 확인합니다.

- `ghcr.io/<OWNER>/project_ifs-backend:sha-<short>`
- `ghcr.io/<OWNER>/project_ifs-frontend:sha-<short>`
- `ghcr.io/<OWNER>/project_ifs-ai:sha-<short>`

## 8) CD 자동화 설정 (EC2 systemd timer)

```bash
sudo mkdir -p /etc/project_ifs
sudo cp runbook/systemd/project-ifs-autodeploy.service /etc/systemd/system/
sudo cp runbook/systemd/project-ifs-autodeploy.timer /etc/systemd/system/
sudo systemctl daemon-reload
```

```bash
sudo tee /etc/project_ifs/auto-deploy.env >/dev/null <<'EOF'
GHCR_USERNAME=<GITHUB_USERNAME>
GHCR_PAT=<GHCR_PAT_READ_PACKAGES>
# OWNER=natu-3
# WATCH_TAG=latest
EOF
sudo chmod 600 /etc/project_ifs/auto-deploy.env
```

```bash
sudo systemctl enable --now project-ifs-autodeploy.timer
sudo systemctl status project-ifs-autodeploy.timer
```

## 9) 첫 배포 (수동 1회 권장)

```bash
cd /srv/project_ifs
./runbook/deploy-ec2.sh <short_sha>
```

검증:

```bash
docker compose --env-file .env.runtime -f docker-compose.prod.yml ps
curl -fsS http://localhost:8081/actuator/health
curl -fsS http://localhost:8000/chat-api/v1/health
```

## 10) 롤백

```bash
cd /srv/project_ifs
./runbook/rollback-ec2.sh
# 또는
./runbook/rollback-ec2.sh sha-<previous_short_sha>
```

## 11) 장애 시 빠른 확인

```bash
sudo journalctl -u project-ifs-autodeploy.service -n 200 --no-pager
docker compose --env-file .env.runtime -f docker-compose.prod.yml ps
docker logs ifs-backend --tail 200
docker logs ifs-python-api --tail 200
```

주요 원인:
- GHCR 인증 실패
- `.env.prod` 누락/오타
- RDS 보안그룹/네트워크 차단
- 잘못된 이미지 태그 지정
