package com.example.backwork.teamsch.lock.service;

import java.time.Duration;
import java.util.Optional;

public interface TeamCalendarLockService {
    Duration LOCK_TTL = Duration.ofSeconds(15);
    long HEARTBEAT_INTERVAL_SECONDS = 5L;

    LockResult acquire(String key, Long userId, String sessionId, Duration ttl);

    LockResult refresh(String key, Long userId, String sessionId, Duration ttl);

    void release(String key, Long userId, String sessionId);

    Optional<LockOwner> getOwner(String key);

    Long getTtlSeconds(String key);

    boolean isLockOwner(String key, Long userId, String sessionId);

    void requireLockOwner(String key, Long userId, String sessionId);
}