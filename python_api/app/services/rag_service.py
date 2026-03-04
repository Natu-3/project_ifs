import boto3
from openai import OpenAI

from app.core.config import get_settings
from app.core.errors import AppError
from app.schemas.rag import IngestRequest, IngestResponse, QueryRequest, QueryResponse, RetrievalItem
from app.services.vector_store_adapter import VectorRecord, build_vector_store_adapter


class RagService:
    def __init__(self) -> None:
        self.settings = get_settings()
        if not self.settings.openai_api_key:
            raise AppError(status_code=500, code="MISSING_OPENAI_KEY", message="OPENAI_API_KEY is not configured.")
        self.client = OpenAI(api_key=self.settings.openai_api_key)
        self.vector_store = build_vector_store_adapter()
        self.s3 = self._build_s3_client()

    def ingest(self, payload: IngestRequest) -> IngestResponse:
        raw_text = self._load_text_from_s3(payload.s3_bucket, payload.s3_key)
        chunks = self._chunk_text(raw_text)
        vectors: list[VectorRecord] = []
        vector_keys: list[str] = []

        for idx, chunk in enumerate(chunks):
            embedding = self._embed(chunk, payload.embedding_model)
            vector_key = f"doc:{payload.document_id}:chunk:{idx:04d}:ver:1"
            vector_keys.append(vector_key)
            metadata = {
                "ownerUserId": payload.owner_user_id,
                "calendarId": payload.calendar_id,
                "documentId": payload.document_id,
                "status": "active",
                "chunkNo": idx,
                "tags": payload.tags,
                "chunk_text": chunk,
                "source_uri": f"s3://{payload.s3_bucket}/{payload.s3_key}",
                "preview": chunk[:200],
            }
            vectors.append(VectorRecord(key=vector_key, embedding=embedding, metadata=metadata))

        self.vector_store.put_vectors(payload.vector_bucket, payload.vector_index, vectors)
        return IngestResponse(
            jobStatus="SUCCESS",
            documentId=payload.document_id,
            chunkCount=len(chunks),
            vectorKeys=vector_keys,
        )

    def query(self, payload: QueryRequest) -> QueryResponse:
        query_embedding = self._embed(payload.question, payload.embedding_model)
        hits = self.vector_store.query_vectors(
            vector_bucket=payload.vector_bucket,
            vector_index=payload.vector_index,
            query_embedding=query_embedding,
            top_k=payload.top_k,
            owner_user_id=payload.owner_user_id,
            calendar_id=payload.calendar_id,
            document_ids=payload.document_ids,
        )

        retrievals: list[RetrievalItem] = [
            RetrievalItem(key=hit.key, distance=hit.distance, metadata=hit.metadata)
            for hit in hits
        ]
        context = "\n\n".join([hit.metadata.get("chunk_text", "") for hit in hits])[:6000]
        answer = self._answer(payload.question, context)
        return QueryResponse(answer=answer, retrievals=retrievals)

    def _embed(self, text: str, model: str) -> list[float]:
        response = self.client.embeddings.create(model=model, input=text)
        if not response.data:
            raise AppError(status_code=502, code="EMBEDDING_FAILED", message="Embedding response is empty.")
        return response.data[0].embedding

    def _answer(self, question: str, context: str) -> str:
        if not context.strip():
            return "검색된 문맥이 없어 답변을 생성할 수 없습니다."

        prompt = (
            "You are a retrieval assistant for a calendar and memo app. "
            "Answer only from the given context. If context is insufficient, say so briefly.\n\n"
            f"[Context]\n{context}\n\n[Question]\n{question}"
        )
        response = self.client.responses.create(
            model=self.settings.openai_model,
            input=[{"role": "user", "content": prompt}],
            timeout=self.settings.openai_timeout_seconds,
        )
        text = getattr(response, "output_text", None)
        if isinstance(text, str) and text.strip():
            return text.strip()
        return "관련 문맥이 부족해 정확한 답변을 생성하지 못했습니다."

    def _build_s3_client(self):
        kwargs: dict = {"region_name": self.settings.aws_region}
        if self.settings.aws_access_key_id and self.settings.aws_secret_access_key:
            kwargs["aws_access_key_id"] = self.settings.aws_access_key_id
            kwargs["aws_secret_access_key"] = self.settings.aws_secret_access_key
            if self.settings.aws_session_token:
                kwargs["aws_session_token"] = self.settings.aws_session_token
        session = boto3.session.Session(**kwargs)
        return session.client("s3")

    def _load_text_from_s3(self, bucket: str, key: str) -> str:
        try:
            response = self.s3.get_object(Bucket=bucket, Key=key)
            body = response["Body"].read()
        except Exception as exc:
            raise AppError(status_code=502, code="S3_READ_FAILED", message=str(exc))

        if not body:
            raise AppError(status_code=400, code="EMPTY_DOCUMENT", message="Uploaded document is empty.")

        try:
            return body.decode("utf-8")
        except UnicodeDecodeError:
            # 2차에서는 PDF/DOC 파서를 붙이고, 현재는 텍스트 디코딩 가능한 문서 위주로 처리한다.
            return body.decode("utf-8", errors="ignore")

    def _chunk_text(self, text: str, chunk_size: int = 800) -> list[str]:
        words = text.split()
        chunks: list[str] = []
        current: list[str] = []
        length = 0
        for word in words:
            if length + len(word) + 1 > chunk_size and current:
                chunks.append(" ".join(current))
                current = []
                length = 0
            current.append(word)
            length += len(word) + 1
        if current:
            chunks.append(" ".join(current))
        return chunks or [text]
