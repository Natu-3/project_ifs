package com.example.backwork.rag.dto;

public record DocumentPresignRequest(
        String fileName,
        String contentType,
        Long calendarId
) {
}
