package com.example.backwork.teamsch.lock.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class LockCommandResponse {
    private boolean success;
    private boolean lockedByMe;
    private String lockKey;
    private Long ownerUserId;
    private String ownerSessionId;
    private Long ttlSeconds;
    private String message;
}