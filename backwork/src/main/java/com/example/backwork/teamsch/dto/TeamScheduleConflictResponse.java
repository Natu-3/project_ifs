package com.example.backwork.teamsch.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class TeamScheduleConflictResponse {
    private String code;
    private Long latestVersion;
    private String message;
}
