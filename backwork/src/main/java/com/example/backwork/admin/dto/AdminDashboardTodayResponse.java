package com.example.backwork.admin.dto;

import java.time.LocalDateTime;

public record AdminDashboardTodayResponse(
        LocalDateTime generatedAt,
        String timezone,
        long userCount,
        long todayScheduleCount,
        String summary,
        String summaryStatus,
        LocalDateTime todayWindowStart,
        LocalDateTime todayWindowEnd,
        int calendarCount,
        int sourceCount
) {
}

