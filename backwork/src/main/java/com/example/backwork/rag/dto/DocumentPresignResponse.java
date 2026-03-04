package com.example.backwork.rag.dto;

public record DocumentPresignResponse(
        Long documentId,
        String uploadUrl,
        String s3Key
) {
}
