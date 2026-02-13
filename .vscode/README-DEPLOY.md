**빌드 없이** GitHub Container Registry(GHCR)에 올라간 공개 이미지를 받아
로컬/서버에서 바로 실행하기 위한 시연용 가이드입니다

- Frontend: `ghcr.io/natu-3/project_ifs-frontend:latest`
- Backend:  `ghcr.io/natu-3/project_ifs-backend:latest`

## 요구사항

- Docker 설치
- Docker Compose (docker compose) 사용 가능
- 인터넷 연결 (이미지 pull 필요)


확인:
```bash
docker --version
docker compose version

- curl -fsSL https://raw.githubusercontent.com/Natu-3/project_ifs/main/install.sh | bash

## 수동실행 가이드

- 레포에 포함된 docker-compose.prod.yml을 사용하거나, 아래 명령으로 직접 실행