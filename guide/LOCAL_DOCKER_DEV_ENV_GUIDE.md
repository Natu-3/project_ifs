# Local Docker Dev Guide (`.dev`)

로컬 개발용 실행은 `docker-compose.dev.yml` + `.env.dev` 조합으로 분리합니다.
이 구성은 Docker 내부 MySQL이 아니라 호스트(개발자 PC)에 설치된 MySQL을 사용합니다.

## 1) 준비

```bash
cp .env.dev.example .env.dev
```

Windows PowerShell:

```powershell
Copy-Item .env.dev.example .env.dev
```

필수 수정:

- `DB_PASSWORD`
- 필요 시 `DB_USER`, `DB_NAME`
- 호스트 MySQL에 `ifscm` 스키마가 없으면 먼저 생성

## 2) 실행

기본 실행 (redis + backend + frontend):

```bash
docker compose --env-file .env.dev -f docker-compose.dev.yml up -d --build
```

AI 포함 실행:

```bash
docker compose --env-file .env.dev -f docker-compose.dev.yml --profile ai up -d --build
```

중지:

```bash
docker compose --env-file .env.dev -f docker-compose.dev.yml down
```

## 3) 포트

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8081`
- MySQL: 호스트에 설치된 MySQL (`.env.dev`의 `DB_HOST:DB_PORT`)
- Redis: `localhost:6379`
- Python API (AI profile): `localhost:8000`

## 4) 호스트 DB 연결 전제

- 호스트 MySQL이 실행 중이어야 함
- 계정/비밀번호가 `.env.dev`와 일치해야 함
- DB 계정이 애플리케이션 접속을 허용해야 함
- 스키마(`ifscm`)가 존재해야 함

예시(로컬 MySQL CLI):

```sql
CREATE DATABASE IF NOT EXISTS ifscm CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
```

## 5) 점검

설정 렌더링 확인:

```bash
docker compose --env-file .env.dev -f docker-compose.dev.yml config
```

상태 확인:

```bash
docker compose --env-file .env.dev -f docker-compose.dev.yml ps
```

로그 확인:

```bash
docker compose --env-file .env.dev -f docker-compose.dev.yml logs -f backend
```

```bash
docker compose --env-file .env.dev -f docker-compose.dev.yml logs -f frontend
```

## 6) 운영과 분리 원칙

- 운영은 `docker-compose.prod.yml` + `.env.prod`만 사용
- 로컬은 `docker-compose.dev.yml` + `.env.dev`만 사용
- `.env.dev`는 커밋하지 않음 (`.gitignore`)
