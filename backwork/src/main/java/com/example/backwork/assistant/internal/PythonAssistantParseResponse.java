package com.example.backwork.assistant.internal;

import java.util.List;

public record PythonAssistantParseResponse(
        String intent,
        String title,
        String content,
        String startAt,
        String endAt,
        boolean allDay,
        List<String> missingFields,
        boolean needsCalendarSelection
) {
}
