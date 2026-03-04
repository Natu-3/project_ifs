import math
from dataclasses import dataclass
from threading import Lock

import boto3

from app.core.config import get_settings
from app.core.errors import AppError


@dataclass
class VectorRecord:
    key: str
    embedding: list[float]
    metadata: dict


@dataclass
class VectorHit:
    key: str
    distance: float
    metadata: dict


class InMemoryVectorStoreAdapter:
    def __init__(self) -> None:
        self._records: list[VectorRecord] = []
        self._lock = Lock()

    def put_vectors(self, _: str, __: str, records: list[VectorRecord]) -> None:
        with self._lock:
            self._records.extend(records)

    def query_vectors(
        self,
        _: str,
        __: str,
        query_embedding: list[float],
        top_k: int,
        owner_user_id: int,
        calendar_id: int,
        document_ids: list[int],
    ) -> list[VectorHit]:
        with self._lock:
            filtered = [
                record
                for record in self._records
                if int(record.metadata.get("ownerUserId", -1)) == owner_user_id
                and int(record.metadata.get("calendarId", -1)) == calendar_id
                and record.metadata.get("status") == "active"
                and int(record.metadata.get("documentId", -1)) in document_ids
            ]

        scored = [(self._cosine_distance(query_embedding, item.embedding), item) for item in filtered]
        scored.sort(key=lambda x: x[0])
        return [
            VectorHit(key=item.key, distance=distance, metadata=item.metadata)
            for distance, item in scored[:top_k]
        ]

    @staticmethod
    def _cosine_distance(a: list[float], b: list[float]) -> float:
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = math.sqrt(sum(x * x for x in a))
        norm_b = math.sqrt(sum(y * y for y in b))
        if norm_a == 0 or norm_b == 0:
            return 1.0
        cosine = dot / (norm_a * norm_b)
        return max(0.0, min(2.0, 1.0 - cosine))


class S3VectorsAdapter:
    def __init__(self) -> None:
        settings = get_settings()
        kwargs: dict = {"region_name": settings.aws_region}
        if settings.aws_access_key_id and settings.aws_secret_access_key:
            kwargs["aws_access_key_id"] = settings.aws_access_key_id
            kwargs["aws_secret_access_key"] = settings.aws_secret_access_key
            if settings.aws_session_token:
                kwargs["aws_session_token"] = settings.aws_session_token

        session = boto3.session.Session(**kwargs)
        try:
            self.client = session.client("s3vectors")
        except Exception as exc:
            raise AppError(status_code=500, code="S3VECTORS_CLIENT_INIT_FAILED", message=str(exc))

    def put_vectors(self, vector_bucket: str, vector_index: str, records: list[VectorRecord]) -> None:
        vectors = [
            {
                "key": record.key,
                "data": {"float32": record.embedding},
                "metadata": record.metadata,
            }
            for record in records
        ]
        try:
            self.client.put_vectors(
                vectorBucketName=vector_bucket,
                indexName=vector_index,
                vectors=vectors,
            )
        except Exception as exc:
            raise AppError(status_code=502, code="S3VECTORS_PUT_FAILED", message=str(exc))

    def query_vectors(
        self,
        vector_bucket: str,
        vector_index: str,
        query_embedding: list[float],
        top_k: int,
        owner_user_id: int,
        calendar_id: int,
        document_ids: list[int],
    ) -> list[VectorHit]:
        filter_json = {
            "$and": [
                {"ownerUserId": {"$eq": owner_user_id}},
                {"calendarId": {"$eq": calendar_id}},
                {"status": {"$eq": "active"}},
                {"documentId": {"$in": document_ids}},
            ]
        }
        try:
            response = self.client.query_vectors(
                vectorBucketName=vector_bucket,
                indexName=vector_index,
                queryVector={"float32": query_embedding},
                topK=top_k,
                filter=filter_json,
                returnMetadata=True,
            )
        except Exception as exc:
            raise AppError(status_code=502, code="S3VECTORS_QUERY_FAILED", message=str(exc))

        raw_items = response.get("vectors") or response.get("matches") or []
        hits: list[VectorHit] = []
        for item in raw_items:
            distance = item.get("distance")
            if distance is None and item.get("score") is not None:
                distance = 1.0 - float(item["score"])
            hits.append(
                VectorHit(
                    key=item.get("key", ""),
                    distance=float(distance or 1.0),
                    metadata=item.get("metadata", {}),
                )
            )
        return hits


def build_vector_store_adapter():
    settings = get_settings()
    backend = (settings.rag_vector_backend or "s3vectors").lower()
    if backend == "inmemory":
        return InMemoryVectorStoreAdapter()
    return S3VectorsAdapter()
