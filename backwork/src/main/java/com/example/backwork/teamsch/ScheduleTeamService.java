package com.example.backwork.teamsch;


import com.example.backwork.redis.RedisPublisher;
import com.example.backwork.teamsch.lock.dto.LockTargetType;
import com.example.backwork.teamsch.lock.service.TeamCalendarLockService;
import com.example.backwork.teamsch.lock.support.TeamCalendarLockKeyFactory;
import com.example.backwork.schedule.repository.ScheduleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScheduleTeamService {
    private final ScheduleRepository repository;
    private final RedisPublisher redisPublisher;
    private final TeamCalendarLockService lockService;

    public void validateWritableWithLock(Long calendarId, Long scheduleId, Long userId, String sessionId) {
        String lockKey = TeamCalendarLockKeyFactory.create(
                calendarId,
                LockTargetType.SCHEDULE,
                String.valueOf(scheduleId)
        );

        try {
            lockService.requireLockOwner(lockKey, userId, sessionId);
        } catch (RedisConnectionFailureException e) {
            log.warn("Redis unavailable. Skip team lock validation for scheduleId={}", scheduleId);
        }
    }
}
