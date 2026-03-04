package com.example.backwork.rag.dto;

public record ChatSourceResponse(
        Long documentId,
        String documentTitle,
        String chunkKey,
        Double score,
        String preview
) {
}
