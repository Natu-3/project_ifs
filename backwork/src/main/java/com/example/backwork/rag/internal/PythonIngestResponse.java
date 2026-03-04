package com.example.backwork.rag.internal;

public record PythonIngestResponse(
        String jobStatus,
        Long documentId,
        Integer chunkCount
) {
}
