package com.example.backwork.teamsch.lock.support;

import com.example.backwork.teamsch.lock.dto.LockTargetType;

public final class TeamCalendarLockKeyFactory {

    private TeamCalendarLockKeyFactory() {
    }

    public static String create(Long calendarId, LockTargetType targetType, String targetId) {
        if (calendarId == null) {
            throw new IllegalArgumentException("calendarId는 필수입니다.");
        }
        if (targetType == null) {
            throw new IllegalArgumentException("targetType은 필수입니다.");
        }

        String normalizedTargetId = targetId == null ? "unknown" : targetId.trim();
        if (normalizedTargetId.isEmpty()) {
            normalizedTargetId = "unknown";
        }

        if (targetType == LockTargetType.SCHEDULE) {
            return String.format("lock:team:%d:schedule:%s", calendarId, normalizedTargetId);
        }

        return String.format("lock:team:%d:create:%s", calendarId, normalizedTargetId);
    }
}