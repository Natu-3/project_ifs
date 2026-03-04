package com.example.backwork.rag.internal;

import java.util.List;

public record PythonIngestRequest(
        Long documentId,
        Long ownerUserId,
        Long calendarId,
        String s3Bucket,
        String s3Key,
        String vectorBucket,
        String vectorIndex,
        String embeddingModel,
        List<String> tags
) {
}
