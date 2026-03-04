# 프로젝트 전반 보안 점검 + AWS 보완 체크리스트 (OWASP + CIS AWS, 빠른 점검표)

## 요약
현재 코드 기준 P0 리스크가 확인됨:
- 세션 기반 인증인데 CSRF 비활성: `SecurityConfig.java`
- 인증 없이 프로필 수정 가능(IDOR 가능): `AuthController.java`
- 메모 API가 무인증 + `userId` 파라미터 신뢰: `SecurityConfig.java`, `MemoController.java`
- 운영 compose에서 내부 서비스 포트 직접 노출(백엔드/파이썬/레디스): `docker-compose.prod.yml`
- Dev 계정정보 파일이 저장소 추적 대상: `.env.dev`, `.gitignore`

## 점검/보완 범위
- 애플리케이션: OWASP Top 10 중심(인증/인가, 세션/CSRF, 보안 설정, 민감정보)
- AWS: CIS AWS Foundations 중심(네트워크 경계, IAM 최소권한, 시크릿, 로깅/탐지/알람)

## 실행 체크리스트 (우선순위)

### P0 (즉시)
- `SecurityConfig`에서 `/api/memos/**`, `/api/schedules/**`, `/api/team-schedules/**`를 `authenticated()`로 전환.
- `/api/auth/profile`에서 `userId` 쿼리 제거, 세션 사용자 기준으로만 자기 프로필 수정 허용.
- `MemoController`의 `userId` 입력 제거, 세션 사용자 ID 사용으로 변경.
- 세션 인증 유지 시 CSRF 보호 활성화(최소 `/api/**` state-changing 메서드 대상), 프론트에 CSRF 토큰 전파 처리.
- 운영 `docker-compose.prod.yml`에서 `8081`, `8000`, `6379` 외부 바인딩 제거(프론트/리버스프록시만 공개).

### P1 (단기)
운영 기본 설정 하드닝:
- SQL/HTTP DEBUG 로깅 비활성: `application.properties`
- DB TLS 강제(`useSSL=true`, 서버 인증 검증)로 RDS 전송구간 암호화.
- Nginx 보안 헤더 추가(`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Content-Security-Policy`): `nginx.conf`
- 쿠키 보안 속성(`Secure`, `HttpOnly`, `SameSite`)를 prod 프로필에서 강제.
- `.env.dev` 추적 제외 및 로컬 샘플 기반 운영(`.env.dev.example`만 버전관리).

### P1 (AWS 인프라)
SG 재구성:
- 인터넷 공개는 80/443(ALB)만 허용.
- EC2/컨테이너 내부 포트는 VPC 내부 통신만.
- RDS는 EC2 SG 소스만 허용, 퍼블릭 액세스 비활성.

IAM 최소권한:
- EC2 Role에 ECR/GHCR pull, CloudWatch 로그 전송, SSM Session Manager 최소 권한만 부여.
- 루트/장기 Access Key 사용 금지, 운영자는 IAM Identity Center 기반.

시크릿 관리:
- DB/OpenAI/GHCR 자격증명은 Secrets Manager 또는 SSM Parameter Store(+KMS)로 이관.
- 배포 스크립트의 `.env.runtime` 생성 시 평문 잔존 최소화(권한 600, 수명 짧게).

### P2 (운영 관측/탐지)
- CloudTrail 전 리전 활성 + 무결성 검증.
- GuardDuty, Security Hub, AWS Config 활성화.

CloudWatch 알람:
- 5xx 급증
- 비정상 로그인 실패율
- 컨테이너 재시작 반복
- RDS 연결 실패율
- 디스크/메모리 임계치

- 애플리케이션 보안 이벤트(로그인/권한거부/중요 설정변경) 구조화 로그 표준화.

## 공개 API/인터페이스/타입 변경 사항
`PUT /api/auth/profile`:
- 기존: `?userId=` 필요.
- 변경: `userId` 입력 제거, 세션 사용자 기준 처리.

`/api/memos` 계열:
- 기존: `userId` 쿼리 파라미터.
- 변경: `userId` 제거, 세션 기반 사용자 컨텍스트 사용.

프론트엔드:
- `auth.js`의 `updateUserProfile(userId, data)` 시그니처를 `updateUserProfile(data)`로 변경.
- 메모 API 호출부에서 `userId` 전달 제거.
- 세션+CSRF 적용 시 요청 헤더에 CSRF 토큰 포함 로직 추가.

## 테스트 케이스/시나리오
인증/인가:
- 비로그인 상태에서 `/api/memos`, `/api/schedules`, `/api/team-schedules`, `/api/auth/profile` 접근 시 401.
- 로그인 사용자 A가 사용자 B 프로필/메모 수정 시 403 또는 차단.

CSRF:
- 토큰 없는 상태 변경 요청(POST/PUT/DELETE) 차단.
- 정상 토큰 요청은 성공.

네트워크:
- 외부에서 EC2 `8081/8000/6379` 직접 접근 불가 확인.
- ALB `80/443` 경유 요청만 정상.

시크릿:
- 저장소/로그/런북에 평문 시크릿 미노출 점검.
- 운영 배포 시 Secrets Manager/SSM 값 주입 정상 확인.

관측:
- 로그인 실패/권한 거부/헬스 실패 시 CloudWatch 알람 트리거 검증.

## 가정 및 기본값
- 배포 토폴로지는 EC2 + Docker Compose + RDS(MySQL) 유지.
- 인증 방식은 단기적으로 세션 기반 유지(토큰 전환은 별도 과제).
- 이번 결과물은 “빠른 점검표”이며, 구현은 후속 턴에서 단계별 패치로 진행.
- AWS 보완은 네트워크+IAM+시크릿+관측까지 포함하고 DR(재해복구) 설계는 제외.

