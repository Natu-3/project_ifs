package com.example.backwork.rag.dto;

import com.example.backwork.rag.DocumentStatus;

import java.time.LocalDateTime;

public record DocumentStatusResponse(
        Long documentId,
        DocumentStatus status,
        Integer chunkCount,
        LocalDateTime updatedAt
) {
}
