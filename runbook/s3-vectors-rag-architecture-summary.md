# S3 Vectors 기반 LLM 챗봇 아키텍처 요약

## 1. 목표

본 설계는 다음과 같은 환경을 전제로 한다.

- **Frontend**: React
- **Main Backend**: Spring Boot
- **AI Service**: Python FastAPI + LangChain
- **Service DB**: AWS RDS
- **Raw Document Storage**: Amazon S3
- **Vector Storage / Retrieval**: Amazon S3 Vectors
- **Deployment**: Docker Compose 기반 EC2 배포

핵심 목표는 사용자가 업로드한 문서를 기반으로 RAG(Retrieval-Augmented Generation)형 챗봇을 구현하고, 이를 Spring-React 서비스 구조에 자연스럽게 통합하는 것이다.

---

## 2. 전체 아키텍처 개요

```text
[React]
   |
   v
[Spring Boot API]
   |  \
   |   \-- [RDS]  (users, chat_sessions, documents, ingest_jobs)
   |
   +--> [Python FastAPI + LangChain]
            |         \
            |          \-- [Embedding / LLM Model]
            |
            +--> [S3 Vectors]
            |
            +--> [S3 Raw Documents]
```

### 역할 분리

#### React
- 파일 업로드 UI
- 채팅 입력/응답 표시
- 문서 목록 및 인덱싱 상태 표시

#### Spring Boot
- 인증/인가
- 서비스 메인 API 제공
- Presigned URL 발급
- 업로드 문서 메타데이터 저장
- Python AI 서비스 호출
- 채팅 로그 및 작업 상태 저장

#### Python FastAPI + LangChain
- S3 원문 문서 로딩
- 텍스트 추출 및 chunking
- 임베딩 생성
- S3 Vectors에 벡터 저장
- 질의 임베딩 생성 및 벡터 검색
- 검색 결과 기반 답변 생성

#### RDS
- 사용자, 세션, 문서, 작업 상태, 채팅 로그 저장

#### S3
- 업로드 원문 파일 저장

#### S3 Vectors
- chunk 단위 벡터 및 메타데이터 저장
- metadata filter 기반 retrieval 수행

---

## 3. 데이터 흐름

### 3.1 문서 업로드 및 인덱싱

1. React가 Spring에 업로드용 Presigned URL 요청
2. Spring이 S3 업로드 URL 발급
3. React가 파일을 S3에 직접 업로드
4. React가 업로드 완료를 Spring에 통보
5. Spring이 문서 메타데이터를 RDS에 저장
6. Spring이 Python 서비스에 ingest 요청
7. Python이 S3에서 문서를 읽고 chunking 및 embedding 수행
8. Python이 S3 Vectors에 벡터 저장
9. Spring이 인덱싱 결과를 RDS 상태값에 반영

### 3.2 챗봇 질의

1. React가 Spring에 질문 요청
2. Spring이 사용자 권한 및 문서 접근 범위를 검증
3. Spring이 Python에 RAG 질의 요청
4. Python이 질문 임베딩 생성
5. Python이 S3 Vectors에 metadata filter 기반 query 수행
6. 검색된 chunk를 문맥으로 조합하여 LLM 답변 생성
7. Python이 답변과 출처 정보를 Spring에 반환
8. Spring이 채팅 로그를 저장하고 React에 응답 반환

---

## 4. S3 Vectors 리소스 설계

### 4.1 권장 리소스 구조

#### Raw Document S3 Bucket
- `myapp-documents-dev`
- `myapp-documents-prod`

#### S3 Vector Bucket
- `myapp-rag-dev`
- `myapp-rag-prod`

#### Vector Index
초기 발표용 MVP에서는 **인덱스를 1개만 두고 metadata filter로 분리**하는 것이 가장 단순하다.

예시:
- `knowledge-base`

### 4.2 인덱스 생성 시 권장값

- **dimension**: 사용 임베딩 모델 차원에 맞춤
- **distance metric**: `cosine` 권장
- **non-filterable metadata keys**: `chunk_text`, `source_uri`, `preview`

### 4.3 벡터 key 설계

각 chunk는 deterministic key를 갖도록 설계한다.

예시:

```text
doc:{documentId}:chunk:{chunkNo}:ver:{version}
```

예:

```text
doc:152:chunk:0003:ver:1
```

이 구조를 사용하면 재인덱싱, 삭제, 추적, 출처 식별이 쉬워진다.

---

## 5. 메타데이터 설계

S3 Vectors에서는 **filterable metadata**와 **non-filterable metadata**를 분리하여 설계하는 것이 중요하다.

### 5.1 Filterable Metadata

권한 분리, 범위 지정, 상태 관리에 사용한다.

```json
{
  "tenantId": "team-001",
  "ownerUserId": 17,
  "workspaceId": "portfolio-demo",
  "documentId": 152,
  "documentType": "pdf",
  "visibility": "private",
  "status": "active",
  "chunkNo": 3,
  "uploadedAtEpoch": 1772552400,
  "tags": ["resume", "project", "backend"]
}
```

### 5.2 Non-filterable Metadata

본문 컨텍스트와 출처 표시용으로 사용한다.

```json
{
  "chunk_text": "실제 본문 chunk 텍스트...",
  "source_uri": "s3://myapp-documents-prod/team-001/report.pdf",
  "preview": "보고서 2장 요약..."
}
```

### 5.3 권장 분리 기준

#### Filterable
- tenantId
- workspaceId
- ownerUserId
- documentId
- status
- visibility
- tags
- uploadedAtEpoch

#### Non-filterable
- chunk_text
- source_uri
- preview

---

## 6. RDS 테이블 설계

벡터는 S3 Vectors에 저장하고, 운영 및 서비스 메타데이터는 RDS에 저장한다.

### 6.1 documents

```sql
id bigint pk
owner_user_id bigint
tenant_id varchar(100)
workspace_id varchar(100)
title varchar(255)
s3_bucket varchar(255)
s3_key varchar(1024)
mime_type varchar(100)
file_size bigint
status varchar(50)          -- UPLOADED / INDEXING / READY / FAILED
vector_bucket varchar(255)
vector_index varchar(255)
embedding_model varchar(100)
chunk_count int
version int
created_at timestamp
updated_at timestamp
```

### 6.2 ingest_jobs

```sql
id bigint pk
document_id bigint
job_status varchar(50)      -- QUEUED / RUNNING / SUCCESS / FAILED
error_message text
started_at timestamp
finished_at timestamp
```

### 6.3 chat_sessions

```sql
id bigint pk
user_id bigint
tenant_id varchar(100)
title varchar(255)
created_at timestamp
```

### 6.4 chat_messages

```sql
id bigint pk
session_id bigint
role varchar(20)            -- USER / ASSISTANT
content text
sources_json json
created_at timestamp
```

---

## 7. React ↔ Spring API 인터페이스

### 7.1 업로드용 Presigned URL 발급

`POST /api/documents/presign`

#### Request

```json
{
  "fileName": "project_overview.pdf",
  "contentType": "application/pdf",
  "tenantId": "team-001",
  "workspaceId": "portfolio-demo"
}
```

#### Response

```json
{
  "documentId": 152,
  "uploadUrl": "https://s3....",
  "s3Key": "team-001/portfolio-demo/152/project_overview.pdf"
}
```

### 7.2 업로드 완료 등록

`POST /api/documents/{documentId}/complete`

#### Request

```json
{
  "title": "프로젝트 개요서",
  "tags": ["project", "architecture"]
}
```

#### Response

```json
{
  "documentId": 152,
  "status": "UPLOADED"
}
```

### 7.3 인덱싱 시작

`POST /api/documents/{documentId}/index`

#### Response

```json
{
  "jobId": 9901,
  "status": "QUEUED"
}
```

### 7.4 인덱싱 상태 조회

`GET /api/documents/{documentId}/status`

#### Response

```json
{
  "documentId": 152,
  "status": "READY",
  "chunkCount": 38,
  "updatedAt": "2026-03-04T14:10:21Z"
}
```

### 7.5 챗 질의

`POST /api/chat/query`

#### Request

```json
{
  "sessionId": 3001,
  "question": "이 프로젝트의 핵심 아키텍처를 설명해줘",
  "tenantId": "team-001",
  "workspaceId": "portfolio-demo",
  "documentIds": [152],
  "topK": 6
}
```

#### Response

```json
{
  "answer": "이 프로젝트는 Spring, React, Python AI 서비스로 분리되어 있습니다...",
  "sources": [
    {
      "documentId": 152,
      "documentTitle": "프로젝트 개요서",
      "chunkKey": "doc:152:chunk:0003:ver:1",
      "score": 0.91,
      "preview": "Spring Boot는 인증과 일정/메모 API를 담당..."
    }
  ]
}
```

---

## 8. Spring ↔ Python 내부 API 인터페이스

### 8.1 문서 인덱싱 요청

`POST /internal/rag/ingest`

#### Request

```json
{
  "documentId": 152,
  "tenantId": "team-001",
  "workspaceId": "portfolio-demo",
  "s3Bucket": "myapp-documents-prod",
  "s3Key": "team-001/portfolio-demo/152/project_overview.pdf",
  "vectorBucket": "myapp-rag-prod",
  "vectorIndex": "knowledge-base",
  "embeddingModel": "amazon.titan-embed-text-v2:0",
  "metadata": {
    "ownerUserId": 17,
    "visibility": "private",
    "status": "active",
    "tags": ["project", "architecture"]
  }
}
```

#### Response

```json
{
  "jobStatus": "SUCCESS",
  "documentId": 152,
  "chunkCount": 38,
  "vectorKeys": [
    "doc:152:chunk:0000:ver:1",
    "doc:152:chunk:0001:ver:1"
  ]
}
```

### 8.2 질의 요청

`POST /internal/rag/query`

#### Request

```json
{
  "question": "이 프로젝트의 핵심 아키텍처를 설명해줘",
  "tenantId": "team-001",
  "workspaceId": "portfolio-demo",
  "ownerUserId": 17,
  "documentIds": [152],
  "vectorBucket": "myapp-rag-prod",
  "vectorIndex": "knowledge-base",
  "embeddingModel": "amazon.titan-embed-text-v2:0",
  "topK": 6,
  "includeMetadata": true
}
```

#### Response

```json
{
  "answer": "프로젝트는 React 프론트, Spring 백엔드, Python AI 서비스로 구성됩니다...",
  "retrievals": [
    {
      "key": "doc:152:chunk:0003:ver:1",
      "distance": 0.083,
      "metadata": {
        "documentId": 152,
        "chunkNo": 3,
        "chunk_text": "Spring Boot는 인증/인가와 API 게이트웨이 역할을 수행...",
        "source_uri": "s3://myapp-documents-prod/team-001/portfolio-demo/152/project_overview.pdf"
      }
    }
  ],
  "usage": {
    "promptTokens": 1240,
    "completionTokens": 291
  }
}
```

---

## 9. Python 서비스 내부 설계 개요

### 9.1 Ingestion Pipeline

```python
class IngestService:
    def ingest_document(req: IngestRequest) -> IngestResult:
        raw_text = load_from_s3(req.s3Bucket, req.s3Key)
        chunks = chunk_text(raw_text)
        embeddings = embed(chunks, model=req.embeddingModel)
        vectors = build_vectors(req, chunks, embeddings)
        put_vectors_to_s3(req.vectorBucket, req.vectorIndex, vectors)
        return IngestResult(...)
```

### 9.2 Retrieval Pipeline

```python
class QueryService:
    def answer(req: QueryRequest) -> QueryResult:
        q_emb = embed_query(req.question, model=req.embeddingModel)
        filter_json = build_filter(req)
        hits = query_s3_vectors(
            vector_bucket=req.vectorBucket,
            index_name=req.vectorIndex,
            query_vector=q_emb,
            top_k=req.topK,
            filter=filter_json,
            return_metadata=True
        )
        context = build_context(hits)
        answer = llm_generate(req.question, context)
        return QueryResult(answer=answer, retrievals=hits)
```

---

## 10. 질의 필터 전략

발표용 MVP와 실제 서비스 안정성을 위해, 모든 retrieval 질의에 metadata filter를 강제하는 것이 좋다.

### 기본 필터 예시

```json
{
  "$and": [
    {"tenantId": {"$eq": "team-001"}},
    {"workspaceId": {"$eq": "portfolio-demo"}},
    {"status": {"$eq": "active"}}
  ]
}
```

### 문서 범위 제한까지 포함한 예시

```json
{
  "$and": [
    {"tenantId": {"$eq": "team-001"}},
    {"workspaceId": {"$eq": "portfolio-demo"}},
    {"status": {"$eq": "active"}},
    {"documentId": {"$in": [152]}}
  ]
}
```

이 구조를 사용하면 다음을 보장하기 쉽다.

- 다른 사용자/팀 문서 누출 방지
- 비활성 문서 제외
- 발표 범위 고정
- 워크스페이스 단위 데이터 분리

---

## 11. 운영상 주의사항

### 11.1 인덱스 생성 시 값 선확정 필요
다음 값은 인덱스 생성 전에 신중히 정해야 한다.

- dimension
- metric
- non-filterable metadata keys

### 11.2 topK는 과도하게 키우지 않기
발표용 MVP에서는 일반적으로 `topK=5~8` 정도가 적절하다.

### 11.3 벡터 적재는 배치 처리 권장
문서 chunk 수가 많아질 경우, `PutVectors`는 적절한 batch 크기로 나누어 처리한다.

### 11.4 IAM 권한 구성
Python 서비스가 사용하는 IAM Role에는 최소한 다음 권한이 필요하다.

- `s3vectors:PutVectors`
- `s3vectors:QueryVectors`
- `s3vectors:GetVectors`
- 필요 시 `s3vectors:DeleteVectors`

또한 원문 로딩을 위해 일반 S3 버킷에 대한 읽기 권한도 필요하다.

---

## 12. 최종 권장안

### 인프라 구성
- **EC2**: nginx, React, Spring Boot, Python AI 서비스 컨테이너 실행
- **RDS**: 사용자/문서/작업상태/채팅 로그 저장
- **S3**: 원본 문서 저장
- **S3 Vectors**: 벡터 및 retrieval 저장소

### 인터페이스 원칙
- React는 Spring만 호출
- Spring은 인증/권한 검증 후 Python 호출
- Python만 S3 / S3 Vectors / Embedding Model을 직접 호출

### 핵심 설계 포인트
- 원문과 벡터 저장소를 분리
- 서비스 메타데이터와 벡터 데이터 역할 분리
- metadata filter를 통한 권한/범위 제어
- deterministic vector key로 재인덱싱 및 추적 용이성 확보

---

## 13. 발표용 한 줄 요약

**사용자가 업로드한 문서는 S3에 저장되고, Python 기반 LangChain 서비스가 이를 chunking·embedding한 뒤 S3 Vectors에 저장한다. 이후 Spring 백엔드는 사용자 권한과 문서 범위를 검증한 후 Python 서비스에 질의를 위임하고, Python은 S3 Vectors에서 metadata-filtered retrieval을 수행해 RAG 응답을 생성한다.**
