package com.example.backwork.rag.dto;

import com.example.backwork.rag.DocumentStatus;

public record DocumentCompleteResponse(
        Long documentId,
        DocumentStatus status
) {
}
