package com.example.backwork.rag.dto;

import java.util.List;

public record ChatQueryRequest(
        String question,
        Long calendarId,
        List<Long> documentIds,
        Integer topK
) {
}
