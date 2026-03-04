package com.example.backwork.rag.internal;

import java.util.List;

public record PythonQueryRequest(
        String question,
        Long ownerUserId,
        Long calendarId,
        List<Long> documentIds,
        String vectorBucket,
        String vectorIndex,
        String embeddingModel,
        Integer topK
) {
}
