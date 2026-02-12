package com.example.backwork.teamsch.dto;

import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class TeamScheduleCreateRequest {
    private Long calendarId;
    private String title;
    private String content;
    private LocalDateTime startAt;
    private LocalDateTime endAt;
    private Long memoId;
    private Integer priority;
}