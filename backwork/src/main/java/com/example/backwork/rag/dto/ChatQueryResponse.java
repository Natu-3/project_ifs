package com.example.backwork.rag.dto;

import java.util.List;

public record ChatQueryResponse(
        String answer,
        List<ChatSourceResponse> sources
) {
}
