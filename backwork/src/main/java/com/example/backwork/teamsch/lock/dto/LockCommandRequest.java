package com.example.backwork.teamsch.lock.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class LockCommandRequest {
    private LockTargetType targetType = LockTargetType.SCHEDULE;
    private String targetId;
}