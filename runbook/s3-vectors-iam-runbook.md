# S3 Presign + S3 Vectors IAM Runbook

## 1. 목적
- Spring 백엔드가 S3 Presigned PUT URL을 발급한다.
- Python API가 S3 원문을 읽고 S3 Vectors에 벡터를 저장/조회한다.
- 최소 권한 IAM 정책으로 운영 환경을 구성한다.

## 2. 환경변수
아래 키를 `docker-compose.prod.yml` + `.env.prod`에 설정한다.

- `AWS_REGION` (예: `ap-northeast-2`)
- `RAG_RAW_BUCKET` (예: `myapp-documents-prod`)
- `RAG_VECTOR_BUCKET` (예: `myapp-rag-prod`)
- `RAG_VECTOR_INDEX` (예: `knowledge-base`)
- `RAG_PRESIGN_EXPIRY_SECONDS` (기본 900)
- `RAG_VECTOR_BACKEND` (`s3vectors`)

## 3. IAM 역할 분리
권장: 백엔드(Spring)와 Python API에 역할을 분리한다.

### 3.1 Backend 역할 (Presign 전용)
`s3:PutObject` 권한만 허용한다.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowPresignPutToRawBucket",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::myapp-documents-prod/*"
    }
  ]
}
```

### 3.2 Python API 역할 (RAG 처리)
원문 읽기 + S3 Vectors API를 허용한다.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowReadRawDocuments",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
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

## 4. 적용 절차
1. S3 Raw bucket과 S3 Vector bucket/index를 생성한다.
2. 위 정책으로 IAM Role 2개(backend/python)를 만든다.
3. EC2/ECS에서 각 컨테이너에 맞는 Role을 연결한다.
4. `.env.prod`에 `AWS_REGION`, `RAG_*` 값을 입력한다.
5. `docker compose --env-file .env.prod -f docker-compose.prod.yml up -d` 실행한다.
6. `/api/documents/presign` 호출 후 반환 URL에 파일 업로드를 수행한다.
7. `/api/documents/{id}/index` 호출 후 `/status`가 `READY`인지 확인한다.
8. `/api/chat/query` 응답의 `sources`가 반환되는지 확인한다.

## 5. 점검 항목
- Presign URL이 실제 `https://<bucket>.s3...` 형태인지 확인
- Python API 로그에 `S3_READ_FAILED`, `S3VECTORS_*` 오류가 없는지 확인
- 다른 사용자/캘린더 문서가 검색되지 않는지 권한 테스트
- IAM 정책에 wildcard 액션(`s3:*`)이 남아있지 않은지 확인

## 6. 장애 대응
- Presign 실패: Backend 역할의 `s3:PutObject` 대상 bucket ARN 재확인
- 인덱싱 실패: Python 역할의 `s3:GetObject` / `s3vectors:*` 권한 확인
- 조회 결과 없음: `RAG_VECTOR_BUCKET`, `RAG_VECTOR_INDEX`, metadata filter 조건 확인
