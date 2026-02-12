package com.example.backwork.teamsch.lock.service;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class LockOwner {
    private Long userId;
    private String sessionId;
}