package com.example.backwork.rag.dto;

import java.util.List;

public record DocumentCompleteRequest(
        String title,
        List<String> tags
) {
}
