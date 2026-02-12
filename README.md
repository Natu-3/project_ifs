
26.01.26 ~ 26.03.02동안 진행한 
프로젝트의 공유 git입니다

참여자

조용연 / 팀장
김창진 / 팀원
박지원 / 팀원 

 
설계 및 공유작업 문서 
https://www.notion.so/Notion-2ee240325172804882ece30540200f3e

## CI/CD 배포
Docker - AWS EC2를 통해 릴리즈
: (관련 주소 추가예정)


## Docker 이미지 태그

CI에서 Docker 이미지를 푸시할 때 아래 2개 태그를 동시에 입력하기

- `latest`
- `sha-<git short sha>` (예: `sha-a1b2c3d`)

권장 규칙:

1. 모든 기본 브랜치 빌드는 `sha-<git short sha>` 태그를 생성한다.
2. 배포 기준 브랜치(예: `main`)에서만 `latest`를 함께 갱신한다.
3. 배포/롤백 시에는 `sha-<git short sha>`를 우선 사용해 정확한 이미지 버전을 고정한다.



## Docker Compose 실행 가이드
루트(`project_ifs`)에서 아래 명령으로 전체 서비스를 실행합니다.

- `docker compose up --build -d`
- `docker compose logs -f backend`
- `docker compose down -v` (초기화가 필요할 때 DB 볼륨까지 삭제)


환경 변수로 DB 이름/비밀번호를 바꾸고 싶다면 실행 전에 지정할 수 있습니다.

- `DB_NAME` (기본값: `ifscm`)
- `DB_PASSWORD` (기본값: `1234`)

예시:
- `DB_NAME=mydb DB_PASSWORD=secret docker compose up --build -d`

> 이미 생성된 `db_data` 볼륨에는 이전 스키마가 남아 있으므로, 스키마 불일치(예: `Table ... doesn't exist`)가 나면 `docker compose down -v` 후 다시 올리세요.



환경 변수로 DB 이름/비밀번호를 바꾸고 싶다면 실행 전에 지정할 수 있습니다.

- `DB_NAME` (기본값: `ifscm`)
- `DB_PASSWORD` (기본값: `1234`)

예시:
- `DB_NAME=mydb DB_PASSWORD=secret docker compose up --build -d`

> 이미 생성된 `db_data` 볼륨에는 이전 스키마가 남아 있으므로, 스키마 불일치(예: `Table ... doesn't exist`)가 나면 `docker compose down -v` 후 다시 올리세요.



구성 서비스:
- `db`: MySQL 8.0 (`db_data` 볼륨에 데이터 영속화)
- `backend`: `backwork` 이미지 빌드/실행, DB 연결 환경변수 사용
- `frontend`: `reactwork` 이미지 빌드/실행, `/api` 요청을 backend로 프록시

## 팀 캘린더 동기화 API 테스트 절차
동일 계정으로 여러 브라우저 세션(예: Chrome 일반창 + 시크릿창, 또는 Chrome + Edge)에서 동기화를 점검합니다.

## EC2 + RDS 운영 배포용 Compose 분리
운영 환경에서는 로컬 개발용(`docker-compose.yml`)과 분리된 `docker-compose.prod.yml` 사용을 권장합니다.

1. 예시 파일 복사
   - `cp .env.prod.example .env.prod`
2. `.env.prod`에 RDS 정보 입력
   - `DB_HOST=<your-rds-endpoint>`
   - `DB_NAME`, `DB_USER`, `DB_PASSWORD`
3. 운영 실행
   - `docker compose --env-file .env.prod -f docker-compose.prod.yml up -d`
4. 운영 중지
   - `docker compose --env-file .env.prod -f docker-compose.prod.yml down`

운영 기본값은 `JPA_DDL_AUTO=validate`이며, 스키마 변경은 마이그레이션 도구(Flyway/Liquibase) 사용을 권장합니다.



1. 동일 계정 로그인
   - 세션 A/B 모두 같은 계정으로 로그인하고 팀 캘린더 화면으로 이동합니다.
2. 이벤트 생성 반영 확인
   - 세션 A에서 새 팀 캘린더 이벤트를 생성합니다.
   - 세션 B에서 새로고침 없이 목록/캘린더에 이벤트가 반영되는지 확인합니다.
   - 즉시 반영이 안 되면 새로고침 후 데이터 일치 여부를 확인합니다.
3. 이벤트 수정 반영 확인
   - 세션 A에서 방금 생성한 이벤트 제목/시간/설명을 수정합니다.
   - 세션 B에서 수정 내용이 동일하게 반영되는지 확인합니다.
4. 이벤트 삭제 반영 확인
   - 세션 A에서 해당 이벤트를 삭제합니다.
   - 세션 B에서 동일 이벤트가 사라졌는지 확인합니다.
5. 오류/경합 케이스 점검(권장)
   - 세션 A/B에서 같은 이벤트를 거의 동시에 수정해 최종 반영 상태를 확인합니다.
   - 실패 응답 발생 시 브라우저 네트워크 탭과 backend 로그(`docker compose logs -f backend`)를 함께 확인합니다.