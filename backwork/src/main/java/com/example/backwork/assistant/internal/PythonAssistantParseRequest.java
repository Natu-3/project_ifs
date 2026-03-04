package com.example.backwork.assistant.internal;

import java.util.List;

public record PythonAssistantParseRequest(
        String message,
        List<ConversationMessage> conversation,
        String timezone,
        String now
) {
    public record ConversationMessage(
            String role,
            String content
    ) {
    }
}
