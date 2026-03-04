package com.example.backwork.assistant.dto;

import java.util.List;

public record AssistantChatRequest(
        String message,
        List<ConversationMessage> conversation,
        ActiveCalendar activeCalendar,
        String timezone
) {
    public record ConversationMessage(
            String role,
            String content
    ) {
    }

    public record ActiveCalendar(
            String type,
            Long id
    ) {
    }
}
