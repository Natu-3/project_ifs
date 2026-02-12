package com.example.backwork.schedule.dto;

import com.example.backwork.schedule.entity.Schedule;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class ScheduleResponse {
    private Long id;
    private String title;
    private String content;
    private LocalDateTime startAt;
    private LocalDateTime endAt;
    private Integer priority;
    private Long memoId;
    public ScheduleResponse(Schedule schedule) {
        this.id = schedule.getId();
        this.title = schedule.getTitle();
        this.content = schedule.getContent();
        this.startAt = schedule.getStartAt();
        this.endAt = schedule.getEndAt();
        this.priority = schedule.getPriority();
        this.memoId = schedule.getMemoId();
    }
}
