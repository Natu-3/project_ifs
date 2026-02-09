package com.example.backwork.schedule.dto;

import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class ScheduleUpdateRequest {
    private String title;
    private String content;
    private LocalDateTime startAt;
    private LocalDateTime endAt;
}
