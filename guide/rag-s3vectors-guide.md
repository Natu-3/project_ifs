# RAG S3/S3 Vectors 적용 가이드

이 문서는 `Spring Presign + Python S3 Vectors` 구성의 운영 키/정책과 `curl` 검증 시나리오를 정리한다.

## 1. 추가된 정책/환경 키

### 1.1 공통(.env.prod / compose)
- `AWS_REGION`: AWS 리전 (예: `ap-northeast-2`)
- `INTERNAL_API_TOKEN`: Spring -> Python 내부 API 인증 토큰
- `RAG_RAW_BUCKET`: 원문 업로드 S3 버킷
- `RAG_VECTOR_BUCKET`: S3 Vectors 버킷
- `RAG_VECTOR_INDEX`: S3 Vectors 인덱스명
- `RAG_EMBEDDING_MODEL`: 임베딩 모델명 (현재 OpenAI 기준)
- `RAG_PRESIGN_EXPIRY_SECONDS`: Presigned URL 만료 초
- `RAG_VECTOR_BACKEND`: `s3vectors` 또는 `inmemory`
- `AWS_ACCESS_KEY_ID`: (선택) Python API AWS 접근키
- `AWS_SECRET_ACCESS_KEY`: (선택) Python API AWS 비밀키
- `AWS_SESSION_TOKEN`: (선택) STS 세션 토큰

### 1.2 Spring 설정 키
- `python.api.base-url`
- `internal.api.token`
- `rag.raw-bucket`
- `rag.vector-bucket`
- `rag.vector-index`
- `rag.embedding-model`
- `rag.presign-expiry-seconds`
- `aws.region`

적용 파일:
- `backwork/src/main/resources/application.properties`
- `backwork/src/main/resources/application-docker.properties`

### 1.3 Python 설정 키
- `internal_api_token`
- `rag_vector_bucket`
- `rag_vector_index`
- `rag_embedding_model`
- `rag_vector_backend`
- `aws_region`
- `aws_access_key_id`
- `aws_secret_access_key`
- `aws_session_token`

적용 파일:
- `python_api/app/core/config.py`

---

## 2. IAM 정책 예시

세부 내용은 `runbook/s3-vectors-iam-runbook.md`를 기준으로 한다.

### 2.1 Backend(Spring) 역할 - Presign 발급용
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowPresignPutToRawBucket",
      "Effect": "Allow",
      "Action": ["s3:PutObject"],
      "Resource": "arn:aws:s3:::myapp-documents-prod/*"
    }
  ]
}
```

### 2.2 Python 역할 - S3 읽기 + S3 Vectors
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowReadRawDocuments",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::myapp-documents-prod",
        "arn:aws:s3:::myapp-documents-prod/*"
      ]
    },
    {
      "Sid": "AllowS3VectorsOps",
      "Effect": "Allow",
      "Action": [
        "s3vectors:PutVectors",
        "s3vectors:QueryVectors",
        "s3vectors:GetVectors",
        "s3vectors:DeleteVectors"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## 3. curl E2E 시나리오

아래는 `localhost:3000`(nginx 프론트), `localhost:8081`(Spring) 기준 예시다.
세션 쿠키 파일(`cookies.txt`)을 사용한다.

### 3.1 로그인
```bash
curl -i -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"userid\":\"user1\",\"password\":\"1234\"}"
```

### 3.2 Presign 요청
```bash
curl -s -b cookies.txt -X POST http://localhost:3000/api/documents/presign \
  -H "Content-Type: application/json" \
  -d "{\"fileName\":\"sample.txt\",\"contentType\":\"text/plain\",\"calendarId\":1}"
```

응답 예시:
```json
{
  "documentId": 152,
  "uploadUrl": "https://....amazonaws.com/...",
  "s3Key": "user-1/calendar-1/....../sample.txt"
}
```

### 3.3 Presigned URL로 파일 업로드
`<UPLOAD_URL>`은 3.2 응답의 `uploadUrl`, 파일은 `sample.txt` 기준.
```bash
curl -i -X PUT "<UPLOAD_URL>" \
  -H "Content-Type: text/plain" \
  --data-binary "@sample.txt"
```

### 3.4 업로드 완료 등록
`<DOC_ID>`는 3.2의 `documentId`.
```bash
curl -s -b cookies.txt -X POST http://localhost:3000/api/documents/<DOC_ID>/complete \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"sample.txt\",\"tags\":[\"demo\",\"rag\"]}"
```

### 3.5 인덱싱 시작
```bash
curl -s -b cookies.txt -X POST http://localhost:3000/api/documents/<DOC_ID>/index
```

### 3.6 인덱싱 상태 조회
```bash
curl -s -b cookies.txt http://localhost:3000/api/documents/<DOC_ID>/status
```

`status`가 `READY`인지 확인한다.

### 3.7 RAG 질의
```bash
curl -s -b cookies.txt -X POST http://localhost:3000/api/chat/query \
  -H "Content-Type: application/json" \
  -d "{\"question\":\"문서 핵심 요약해줘\",\"calendarId\":1,\"documentIds\":[<DOC_ID>],\"topK\":6}"
```

응답에서 `answer`, `sources[].chunkKey`, `sources[].preview`를 확인한다.

---

## 4. 운영 점검 체크
- `/api/documents/presign` 응답 URL이 실제 S3 도메인인지
- 업로드 후 `/index` 호출 시 Python 로그에 `S3_READ_FAILED`가 없는지
- `/api/chat/query` 응답에서 다른 사용자 문서가 섞이지 않는지
- `RAG_VECTOR_BACKEND=s3vectors` 설정이 반영됐는지
- IAM 정책에 `s3:*` 같은 과도한 권한이 없는지

