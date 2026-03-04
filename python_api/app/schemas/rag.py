from pydantic import BaseModel, Field


class IngestRequest(BaseModel):
    document_id: int = Field(alias="documentId")
    owner_user_id: int = Field(alias="ownerUserId")
    calendar_id: int = Field(alias="calendarId")
    s3_bucket: str = Field(alias="s3Bucket")
    s3_key: str = Field(alias="s3Key")
    vector_bucket: str = Field(alias="vectorBucket")
    vector_index: str = Field(alias="vectorIndex")
    embedding_model: str = Field(alias="embeddingModel")
    tags: list[str] = Field(default_factory=list)


class IngestResponse(BaseModel):
    job_status: str = Field(alias="jobStatus")
    document_id: int = Field(alias="documentId")
    chunk_count: int = Field(alias="chunkCount")
    vector_keys: list[str] = Field(alias="vectorKeys")


class QueryRequest(BaseModel):
    question: str = Field(min_length=1, max_length=4000)
    owner_user_id: int | None = Field(alias="ownerUserId", default=None)
    calendar_id: int = Field(alias="calendarId")
    document_ids: list[int] = Field(alias="documentIds", default_factory=list)
    vector_bucket: str = Field(alias="vectorBucket")
    vector_index: str = Field(alias="vectorIndex")
    embedding_model: str = Field(alias="embeddingModel")
    top_k: int = Field(alias="topK", default=6, ge=1, le=20)


class RetrievalItem(BaseModel):
    key: str
    distance: float
    metadata: dict


class QueryResponse(BaseModel):
    answer: str
    retrievals: list[RetrievalItem]
