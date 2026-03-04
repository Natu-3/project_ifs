package com.example.backwork.rag.dto;

import com.example.backwork.rag.IngestJobStatus;

public record DocumentIndexResponse(
        Long jobId,
        IngestJobStatus status
) {
}
