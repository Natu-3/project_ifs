package com.example.backwork.teamsch.service;

import lombok.Getter;

@Getter
public class TeamScheduleVersionConflictException extends RuntimeException {
    private final Long latestVersion;

    public TeamScheduleVersionConflictException(Long latestVersion) {
        super("일정이 다른 사용자에 의해 변경되었습니다.");
        this.latestVersion = latestVersion;
    }
}
