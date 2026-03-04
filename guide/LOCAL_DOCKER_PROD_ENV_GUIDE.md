# 로컬 Docker 실행 가능 여부 및 환경변수 설정 가이드 (prod compose 기준)


`docker-compose.prod.yml`은 로컬 MySQL 컨테이너를 포함하지 않으므로, 아래 조건이 충족되어야 합니다.

- 외부 MySQL(DB) 접속 가능 (`DB_HOST`, `DB_USER`, `DB_PASSWORD` 등)
- Docker가 GHCR 이미지를 pull 가능 (필요 시 `docker login ghcr.io`)
- 포트 충돌 없음 (`3000`, `8081`, `6379`; AI 사용 시 `8000`)

`외부 DB 없이 실행 불가능한 버전(docker 내부의 db 제거함)`

## 2) 실행 방식 요약

기본 실행 (AI 제외):

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
```

AI API 포함 실행:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml --profile ai up -d
```

중지:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml down
```

## 3) 환경변수 파일 준비

템플릿 복사:

```bash
cp .env.prod.example .env.prod
```

Windows PowerShell:

```powershell
Copy-Item .env.prod.example .env.prod
```

## 4) 필수 환경변수 (최소 실행 기준)

아래 값은 사실상 필수입니다.

- `DB_HOST`: 외부 MySQL 주소 (RDS endpoint 또는 로컬/사내 DB 주소)
- `DB_USER`: DB 계정
- `DB_PASSWORD`: DB 비밀번호

권장 명시 (기본값이 있어도 명시 추천):

- `DB_PORT` (기본 `3306`)
- `DB_NAME` (기본 `ifscm`)
- `APP_CORS_ALLOWED_ORIGINS` (기본 `http://localhost:3000`)

## 5) 선택 환경변수 (기본값 있음)

백엔드/공통:

- `JPA_DDL_AUTO` (기본 `validate`)
- `SPRING_PROFILES_ACTIVE` (기본 `prod`)

AI 프로필 사용 시:

- `OPENAI_API_KEY` (없어도 컨테이너 기동은 가능할 수 있으나, AI 기능 호출 실패 가능)
- `OPENAI_MODEL` (기본 `gpt-4.1-mini`)
- `CHAT_RETENTION_DAYS` (기본 `30`)
- `RATE_LIMIT_PER_MINUTE` (기본 `20`)

이미지 태그 고정(권장):

- `BACKEND_IMAGE`
- `FRONTEND_IMAGE`
- `PYTHON_API_IMAGE`

지정하지 않으면 각 이미지의 `:latest`를 사용합니다.

## 6) 로컬 실행용 `.env.prod` 예시

AI 미사용 기준 예시:

```dotenv
# 외부 DB (예: RDS / 사내 MySQL / 로컬에 별도 실행한 MySQL)
DB_HOST=your-db-host
DB_PORT=3306
DB_NAME=ifscm
DB_USER=app_user
DB_PASSWORD=change-me

# 백엔드
JPA_DDL_AUTO=validate
SPRING_PROFILES_ACTIVE=prod
APP_CORS_ALLOWED_ORIGINS=http://localhost:3000

# 이미지 (선택: 명시하지 않으면 latest)
BACKEND_IMAGE=ghcr.io/natu-3/project_ifs-backend:latest
FRONTEND_IMAGE=ghcr.io/natu-3/project_ifs-frontend:latest

# AI 프로필 미사용이면 비워도 됨
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
CHAT_RETENTION_DAYS=30
RATE_LIMIT_PER_MINUTE=20
```

AI 포함 실행 시 추가:

```dotenv
PYTHON_API_IMAGE=ghcr.io/natu-3/project_ifs-ai:latest
OPENAI_API_KEY=<your-openai-api-key>
```

## 7) 실행 전 체크리스트

- `docker compose --env-file .env.prod -f docker-compose.prod.yml config` 로 치환 결과 확인
- GHCR private 이미지라면 `docker login ghcr.io` 수행
- DB 접속 허용 IP/보안그룹 확인 (로컬 PC에서 접근 가능한지)
- 로컬 포트 사용 중 여부 확인 (`3000`, `8081`, `6379`, `8000`)

## 8) 예상되는 실패 원인 (코드 문제 아님)

- DB 연결 실패: `DB_HOST/DB_USER/DB_PASSWORD` 오류 또는 네트워크 차단
- 이미지 pull 실패: GHCR 인증 미설정 또는 권한 없음
- CORS 이슈: `APP_CORS_ALLOWED_ORIGINS` 누락/오설정
- AI 엔드포인트 실패: `--profile ai`로 실행했지만 `OPENAI_API_KEY` 미설정

## 9) 참고

- `docker-compose.prod.yml`은 `redis`, `backend`, `frontend`를 기본 실행하며 `python_api`는 `ai` 프로필일 때만 실행되는 버전입니다.
- 외부 DB 없이 완전 로컬 실행이 필요하면 `docker-compose.yml`(개발용)을 사용해야 합니다.
