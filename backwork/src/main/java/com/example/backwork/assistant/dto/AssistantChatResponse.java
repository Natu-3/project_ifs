package com.example.backwork.assistant.dto;

import java.time.LocalDateTime;
import java.util.List;

public record AssistantChatResponse(
        String reply,
        String intent,
        String status,
        List<CalendarOption> calendarOptions,
        CreatedSchedule createdSchedule,
        String summary
) {
    public record CalendarOption(
            String type,
            Long id,
            String name,
            boolean writable
    ) {
    }

    public record CreatedSchedule(
            Long id,
            String title,
            LocalDateTime startAt,
            LocalDateTime endAt,
            String calendarType,
            Long calendarId
    ) {
    }
}
