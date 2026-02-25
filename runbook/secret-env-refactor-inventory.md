# 민감정보 환경변수화 후보 인벤토리 (AWS 빌드/배포용)

## 요약
이 문서는 AWS 빌드/배포 기준으로 `API 키`, `DB 비밀번호` 등 민감정보를 코드/설정에서 제거하고 `.env`(및 CI/배포 환경변수)로 이관하기 위한 **사전 인벤토리 문서**다.

적용 범위와 기준은 다음과 같이 확정한다.

- 범위: 전체 저장소 분류 (운영/개발/테스트/문서/보존파일 포함)
- 기준: 민감+준민감 (비밀번호/키/토큰 + 운영환경값 포함)

## 실행 반영 상태 (2026-02-22)

### P0 상태
- [x] `python_api/alembic.ini` 하드코딩 DB 자격증명 제거 (`root:1234` 제거, placeholder URL로 변경)
- [x] `python_api/alembic/env.py`에 `ALEMBIC_DATABASE_URL` 우선 사용 로직 추가
- [x] `.env.prod`의 약한 값 `DB_PASSWORD=1234` 제거 후 placeholder로 교체 (`change-me`)

### P1 상태 (1차)
- [x] `docker-compose.yml`의 `DB_PASSWORD:-1234` fallback 제거 (MySQL/healthcheck/backend/python_api)
- [x] `docker-compose.yml`의 `DB_USER: root` -> `DB_USER: ${DB_USER}`로 변경
- [x] `docker-compose.prod.yml`의 `DB_USER:-root` fallback 제거
- [x] `backwork/src/main/resources/application.properties`의 `DB_USER`, `DB_PASSWORD` fallback 제거
- [x] `python_api/app/core/config.py`의 `db_user`, `db_password` 기본값 제거
- [x] `python_api/app/core/config.py`에서 `DATABASE_URL` 미사용 시 `DB_USER`/`DB_PASSWORD` 누락 검증 추가
- [x] `.env.prod`, `.env.prod.example`에 `DB_USER` 명시 추가
- [ ] `APP_CORS_ALLOWED_ORIGINS` 운영 fallback 제거 여부 결정 및 적용
- [ ] 운영 `DB_USER=root` 대체용 앱 전용 DB 계정 정책 확정
- [ ] 인벤토리 표의 각 항목에 상태 컬럼 추가 여부(선택)

## 대상 분류 기준

### A. 즉시 이관 필요 (민감 하드코딩)
- 실행 경로에서 실제 자격증명/비밀값이 하드코딩된 항목
- 운영 접속 실패 또는 정보노출로 직접 이어질 수 있는 항목
- 우선순위 기본값: `P0`

### B. 기본값 제거/약화 필요 (민감 기본값/취약 기본값)
- 환경변수 참조는 되어 있으나 취약한 fallback(`1234`, `root` 등)이 남아있는 항목
- 개발 편의 기본값이 운영으로 혼입될 위험이 있는 항목
- 우선순위 기본값: `P1`

### C. 이미 env화됨 (검증만 필요)
- 환경변수 참조로 이미 전환되어 있으나, 값 주입 위치/정책 검증이 필요한 항목
- 예시 파일의 placeholder 정책 확인이 필요한 항목
- 우선순위 기본값: `P1`

### D. 예시/문서/보존파일 (운영 영향 낮음, 정책 결정 필요)
- 실행 코드가 아닌 문서/샘플 SQL/보존용 `.dat` 파일에 존재하는 예시값/더미값
- 실비밀은 아니어도 저장소 스캔 시 혼동을 줄 수 있는 항목
- 우선순위 기본값: `P2`

## 후보 목록 표 (1차 인벤토리)

| 구분 | 파일 | 라인 | 현재 값(마스킹) | 분류 | 권장 조치 | AWS 반영 위치 |
|---|---|---:|---|---|---|---|
| P0 | `python_api/alembic.ini` | 4 | `mysql+pymysql://<user>:****@db:3306/ifscm` | A. 민감 하드코딩 | `DATABASE_URL` 또는 `ALEMBIC_DATABASE_URL` env 사용으로 치환 | EC2 런타임 env / SSM Parameter Store 또는 Secrets Manager |
| P0 | `.env.prod` | 2 | `DB_PASSWORD=****` (`1234` 확인됨) | A. 민감 하드코딩(약한 값) | 강한 비밀번호로 교체, 배포 경로 표준화 | EC2 `/app/.env.prod` 또는 SSM/Secrets Manager |
| P1 | `docker-compose.yml` | 14 | `${DB_PASSWORD:-****}` (`1234` fallback) | B. 취약 기본값 | fallback 제거 또는 dev 전용 compose 분리 | 로컬 `.env` (dev), 운영은 사용 금지 |
| P1 | `docker-compose.yml` | 21 | `-p${DB_PASSWORD:-****}` (`1234` fallback) | B. 취약 기본값 | healthcheck fallback 제거, `DB_PASSWORD` 필수화 | 로컬 `.env` / 운영 env |
| P1 | `docker-compose.yml` | 42 | `${DB_PASSWORD:-****}` (`1234` fallback) | B. 취약 기본값 | backend 컨테이너에서 `DB_PASSWORD` 필수화 | 로컬 `.env` / 운영 env |
| P1 | `docker-compose.yml` | 65 | `${DB_PASSWORD:-****}` (`1234` fallback) | B. 취약 기본값 | python_api 컨테이너에서 `DB_PASSWORD` 필수화 | 로컬 `.env` / 운영 env |
| P1 | `python_api/app/core/config.py` | 19 | `db_password = "****"` (`1234`) | B. 취약 기본값 | 기본값 제거 또는 dev profile 전용값으로 분리 | Python 앱 env (`DB_PASSWORD`) |
| P1 | `backwork/src/main/resources/application.properties` | 4 | `${DB_PASSWORD:****}` (`1234` fallback) | B. 취약 기본값 | 운영 프로파일에서 fallback 제거 | Spring env (`DB_PASSWORD`) |
| P1 | `python_api/app/core/config.py` | 18 | `db_user = "root"` | B. 준민감 기본값 | 운영에서 앱 전용 DB 사용자 사용, fallback 정책 재검토 | Python 앱 env (`DB_USER`) |
| P1 | `backwork/src/main/resources/application.properties` | 3 | `${DB_USER:root}` | B. 준민감 기본값 | 운영 프로파일에서 `DB_USER` 명시값 주입 | Spring env (`DB_USER`) |
| P1 | `docker-compose.prod.yml` | 39 | `${DB_USER:-root}` | B. 준민감 기본값 | 운영 compose에서 `DB_USER` fallback 제거 권장 | `.env.prod` / EC2 런타임 env |
| P1 | `docker-compose.prod.yml` | 62 | `${DB_USER:-root}` | B. 준민감 기본값 | 운영 compose에서 `DB_USER` fallback 제거 권장 | `.env.prod` / EC2 런타임 env |
| P1 | `docker-compose.prod.yml` | 7 | `${DB_PASSWORD}` | C. 이미 env화됨 | 값 주입 경로/권한 정책 검증 | `.env.prod` / EC2 / SSM/Secrets Manager |
| P1 | `docker-compose.prod.yml` | 14 | `-p${DB_PASSWORD}` | C. 이미 env화됨 | healthcheck에서 값 주입 여부 검증 | `.env.prod` / EC2 런타임 env |
| P1 | `docker-compose.prod.yml` | 40 | `${DB_PASSWORD}` | C. 이미 env화됨 | backend 컨테이너 주입 검증 | `.env.prod` / EC2 런타임 env |
| P1 | `docker-compose.prod.yml` | 63 | `${DB_PASSWORD}` | C. 이미 env화됨 | python_api 컨테이너 주입 검증 | `.env.prod` / EC2 런타임 env |
| P1 | `docker-compose.prod.yml` | 65 | `${OPENAI_API_KEY:-}` | C. 이미 env화됨 | CI/운영에서만 실제 키 주입, 누락 시 에러 동작 검증 | GitHub Secrets / EC2 env / Secrets Manager |
| P1 | `docker-compose.prod.yml` | 37 | `${DB_PORT:-3306}` | C. 준민감 env화 | 운영 포트값 명시 여부 검증 | `.env.prod` |
| P1 | `docker-compose.prod.yml` | 38 | `${DB_NAME:-ifscm}` | C. 준민감 env화 | 운영 DB명 명시 여부 검증 | `.env.prod` |
| P1 | `docker-compose.prod.yml` | 39 | `${DB_USER:-root}` | C. 준민감 env화 | 운영 사용자 root 금지 정책 적용 검토 | `.env.prod` / DB 계정 정책 |
| P1 | `docker-compose.prod.yml` | 43 | `${APP_CORS_ALLOWED_ORIGINS:-http://localhost:3000}` | C. 준민감 env화 | 운영 CORS 도메인 명시 필수화 | `.env.prod` / 배포 환경변수 |
| P1 | `.env.prod.example` | 4 | `DB_PASSWORD=change-me` | C. 예시 placeholder | placeholder 유지, 실값 금지 문구 명시 | 예시 파일(버전관리 허용) |
| P1 | `.env.prod.example` | 17 | `OPENAI_API_KEY=your-openai-api-key` | C. 예시 placeholder | placeholder 유지, 실값 금지 문구 명시 | 예시 파일(버전관리 허용) |
| P2 | `README.md` | 46 | `DB_PASSWORD` 기본값 예시 `1234` | D. 문서 예시 | `change-me`/`<required>` 등으로 교체 검토 | 문서만 (AWS 미반영) |
| P2 | `README.md` | 49 | `DB_PASSWORD=secret` 예시 | D. 문서 예시 | 예시 표기 정책 통일 | 문서만 (AWS 미반영) |
| P2 | `backwork/docker-compose.yml` | 13 | `SPRING_DATASOURCE_PASSWORD: 1234` (주석) | D. 보존/예시 | `change-me`로 교체 또는 유지 사유 명시 | 문서/예시 구성 |
| P2 | `backwork/docker-compose.yml` | 19 | `MYSQL_ROOT_PASSWORD: 1234` (주석) | D. 보존/예시 | `change-me`로 교체 또는 유지 사유 명시 | 문서/예시 구성 |
| P2 | `backwork/src/main/java/com/example/backwork/auth/jwt/JwtProvider.java.dat` | 18 | `SECRET_KEY` 선언 (보존파일) | D. 보존파일 경고 | 보존파일 제거/별도 보관 또는 더미 문자열화 | 저장소 정책(실행환경 아님) |
| P2 | `backwork/src/main/java/com/example/backwork/auth/jwt/JwtProvider.java.dat` | 19 | `"<dummy-like-jwt-secret>"` 문자열 | D. 보존파일 경고 | 실제/유사 비밀 문자열 제거 권장 | 저장소 정책(실행환경 아님) |
| P2 | `envs/초기값 ver2.sql` | 134 | `INSERT INTO user ...` (샘플 데이터) | D. 샘플 SQL | 샘플 데이터임을 명시, 운영 덤프와 분리 | 샘플 파일(버전관리 허용) |
| P2 | `envs/초기값 ver2.sql` | 136 | `dummyhash` (`$2a$10_dummyhash`) | D. 샘플 SQL 더미 해시 | 더미값 유지 가능, 주석으로 명시 권장 | 샘플 파일(버전관리 허용) |
| P2 | `envs/초기값 ver2.sql` | 137 | `dummyhash` (`$2a$10_dummyhash`) | D. 샘플 SQL 더미 해시 | 더미값 유지 가능, 주석으로 명시 권장 | 샘플 파일(버전관리 허용) |
| P2 | `envs/초기값 임시.sql` | 81 | `INSERT INTO member ...` (샘플 데이터) | D. 샘플 SQL | 샘플 데이터임을 명시, 운영 덤프와 분리 | 샘플 파일(버전관리 허용) |
| P2 | `envs/초기값 임시.sql` | 83 | `dummyhash` (`$2a$10_dummyhash`) | D. 샘플 SQL 더미 해시 | 더미값 유지 가능, 주석으로 명시 권장 | 샘플 파일(버전관리 허용) |
| P2 | `envs/초기값 임시.sql` | 84 | `dummyhash` (`$2a$10_dummyhash`) | D. 샘플 SQL 더미 해시 | 더미값 유지 가능, 주석으로 명시 권장 | 샘플 파일(버전관리 허용) |

## 리팩토링 우선순위

### P0 (즉시)
- 운영 배포 경로에서 실제 인증/접속 실패 또는 정보노출 위험이 있는 항목
- 대상: `python_api/alembic.ini` 하드코딩 DB URL, 실제 운영 `.env.prod`의 약한 `DB_PASSWORD`

### P1 (단기)
- 개발 기본값/예시값이 운영에 혼입될 수 있는 항목
- 대상: `1234`, `root` fallback, 운영 compose의 준민감 기본값, env화된 항목의 값 주입 검증

### P2 (정리)
- 문서/보존파일/샘플 SQL 정리
- 대상: `README.md`, `backwork/docker-compose.yml` 주석 예시, `.dat` 보존파일, `envs/*.sql` 샘플 데이터

## 공개 API / 인터페이스 / 타입 변경(예정) (문서 선반영)

### 1) 환경변수 계약(추가/강화)
- `DB_PASSWORD` (운영 필수)
- `DB_USER` (운영에서 `root` 기본값 제거 권장)
- `OPENAI_API_KEY` (AI 기능 사용 시 필수)
- `DATABASE_URL` 또는 `ALEMBIC_DATABASE_URL` (Alembic 전용; 둘 중 하나로 표준화)
- `APP_CORS_ALLOWED_ORIGINS` (운영값 명시 권장/필수화 검토)

### 2) Python 설정 로딩 정책
- `python_api/app/core/config.py`의 `db_password="1234"` 기본값 제거 또는 dev 전용 프로파일로 제한
- Alembic이 애플리케이션 설정(`DATABASE_URL`)을 재사용하도록 통합 검토 (권장)

### 3) Spring 설정 정책
- `backwork/src/main/resources/application.properties`의 `DB_PASSWORD:1234` fallback 제거 또는 dev 프로파일로 분리
- 운영 프로파일에서 민감값 fallback 금지 원칙 문서화

## 리팩토링 대상 확정 체크리스트
- [ ] `값을 env로 옮김`과 `기본값 fallback 제거`를 별도 작업으로 분리해 이슈 생성
- [ ] `DB_PASSWORD` 실제 운영값 저장 위치를 표준화 (EC2 `.env.prod` vs SSM/Secrets Manager)
- [ ] `OPENAI_API_KEY` 주입 위치를 표준화 (GitHub Secrets / EC2 런타임 / Secrets Manager)
- [ ] `DB_USER` 운영 전용 계정 생성 여부(DBA 정책) 결정
- [ ] `DATABASE_URL` vs `ALEMBIC_DATABASE_URL` 중 Alembic 표준 변수명 확정
- [ ] 운영 `APP_CORS_ALLOWED_ORIGINS` 실제 도메인 명시 (localhost fallback 제거 검토)
- [ ] `.env.prod.example`에 “실제 비밀값 커밋 금지” 주석/문구 유지 또는 강화
- [ ] `.dat` 보존파일(JWT 예시 문자열 포함) 보관 정책 결정 (삭제/분리/더미화)

## 검증 체크리스트

### 문서 검증
- [ ] 모든 항목이 `파일:라인` 기준으로 식별 가능하다.
- [ ] `현재 값(마스킹)`에 실비밀이 노출되지 않는다.
- [ ] `권장 조치`와 `AWS 반영 위치`가 모두 기입되어 있다.

### 환경변수 주입 검증 (구현 단계)
- [ ] `.env` / `.env.prod` / CI Secrets / EC2 런타임 env 값 주입 경로가 문서와 일치한다.
- [ ] backend / python_api 컨테이너가 env 주입 상태에서 정상 기동한다.
- [ ] `OPENAI_API_KEY` 미설정 시 python_api가 의도된 에러를 반환한다.
- [ ] Alembic 마이그레이션이 env 기반 DB URL로 정상 연결된다.

### 하드코딩 재스캔 명령 (리팩토링 후 반복 실행)
```powershell
# 1) 민감 키워드 및 자격증명 문자열 후보 검색
rg -n -i --glob '!**/__pycache__/**' --glob '!**/*.pyc' "(password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key|client[_-]?secret|jwt|openai|bearer)"

# 2) 커넥션 문자열 하드코딩 후보 검색
rg -n --glob '!**/__pycache__/**' --glob '!**/*.pyc' "(jdbc:|postgres://|postgresql://|mysql://|redis://|mongodb://|amqp://)"

# 3) 취약 기본값/예시값 잔존 검색
rg -n "1234|change-me|dummyhash|your-openai-api-key"

# 4) Alembic/URL 자격증명 잔존 여부 점검 (운영 코드 경로 중심)
rg -n "1234|sqlalchemy\.url\s*=\s*.*://.*:.*@"

# 5) 실값 오탐 방지 포함 점검 (예시 파일 제외 패턴은 팀 정책에 맞게 추가)
rg -n -i "SECRET_KEY|OPENAI_API_KEY=.*[A-Za-z0-9]"
```

## 구현 메모 (이번 단계 범위)
- 이번 단계는 **문서화만 수행**한다.
- 실제 코드 변경(환경변수화/fallback 제거/프로파일 분리)은 별도 구현 단계에서 진행한다.

## 명시적 가정 및 기본 선택
- `.env.prod`, `.env`는 Git 미추적 정책 유지 (`.gitignore` 확인됨)
- `.env.prod.example`의 placeholder (`change-me`, `your-openai-api-key`)는 유지 가능
- `envs/*.sql`의 `dummyhash`는 운영 비밀이 아닌 샘플 데이터로 분류
- `.dat` 보존파일도 저장소 내 문자열 노출 위험 때문에 인벤토리에 포함
- 운영 반영 위치는 우선 `EC2 런타임 env / .env.prod` 기준으로 표기하고, 보안 성숙도에 따라 `SSM/Secrets Manager`로 상향 가능
