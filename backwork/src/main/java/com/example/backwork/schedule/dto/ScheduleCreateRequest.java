package com.example.backwork.schedule.dto;

import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class ScheduleCreateRequest {
    private String title;
    private String content;
    private LocalDateTime startAt;
    private LocalDateTime endAt;
    private Long memoId;
}
