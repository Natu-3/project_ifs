package com.example.backwork.teamsch.lock.service;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class LockResult {
    private boolean success;
    private LockOwner owner;
    private Long ttlSeconds;
}