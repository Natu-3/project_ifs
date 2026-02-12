package com.example.backwork.teamsch.service;

import com.example.backwork.calendar.Calendar;
import com.example.backwork.calendar.share.TeamCalendarAccessService;
import com.example.backwork.member.User;
import com.example.backwork.member.UserRepository;
import com.example.backwork.memo.MemoPostRepository;
import com.example.backwork.redis.RedisPublisher;
import com.example.backwork.schedule.entity.Schedule;
import com.example.backwork.schedule.repository.ScheduleRepository;
import com.example.backwork.teamsch.dto.TeamScheduleCreateRequest;
import com.example.backwork.teamsch.dto.TeamScheduleUpdateRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class TeamScheduleService {

    private final ScheduleRepository scheduleRepository;
    private final UserRepository userRepository;
    private final MemoPostRepository memoPostRepository;
    private final TeamCalendarAccessService teamCalendarAccessService;
    private final RedisPublisher redisPublisher;

    public List<Schedule> findByMonth(Long userId, Long calendarId, LocalDateTime start, LocalDateTime end) {
        teamCalendarAccessService.requireMember(calendarId, userId);

        List<Schedule> rangedSchedules = scheduleRepository
                .findByCalendarIdAndStartAtLessThanEqualAndEndAtGreaterThanEqual(calendarId, end, start);

        List<Schedule> singleDaySchedules = scheduleRepository
                .findByCalendarIdAndEndAtIsNullAndStartAtBetween(calendarId, start, end);

        Map<Long, Schedule> uniqueSchedules = new LinkedHashMap<>();
        rangedSchedules.forEach(schedule -> uniqueSchedules.put(schedule.getId(), schedule));
        singleDaySchedules.forEach(schedule -> uniqueSchedules.put(schedule.getId(), schedule));

        return new ArrayList<>(uniqueSchedules.values());
    }

    @Transactional
    public Schedule create(Long userId, TeamScheduleCreateRequest request) {
        Calendar calendar = teamCalendarAccessService.requireWritable(request.getCalendarId(), userId);
        User user = userRepository.findById(userId).orElseThrow();

        Schedule saved = scheduleRepository.save(new Schedule(
                calendar,
                user,
                request.getTitle(),
                request.getContent(),
                request.getStartAt(),
                request.getEndAt(),
                resolveMemoId(user, request.getMemoId()),
                resolvePriority(request.getPriority())
        ));

        publishEvent("CREATED", request.getCalendarId(), saved.getId(), userId);
        return saved;
    }

    @Transactional
    public Schedule update(Long userId, Long scheduleId, TeamScheduleUpdateRequest request) {
        teamCalendarAccessService.requireWritable(request.getCalendarId(), userId);

        Schedule schedule = getTeamSchedule(scheduleId, request.getCalendarId());
        requireMatchingVersion(request.getBaseVersion(), schedule.getVersion());
        User user = userRepository.findById(userId).orElseThrow();

        schedule.update(
                request.getTitle(),
                request.getContent(),
                request.getStartAt(),
                request.getEndAt(),
                resolveMemoId(user, request.getMemoId()),
                resolvePriority(request.getPriority())
        );

        try {
            scheduleRepository.flush();
        } catch (ObjectOptimisticLockingFailureException e) {
            throw buildVersionConflict(scheduleId);
        }

        publishEvent("UPDATED", request.getCalendarId(), schedule.getId(), userId);
        return schedule;
    }

    @Transactional
    public void delete(Long userId, Long calendarId, Long scheduleId, Long baseVersion) {
        teamCalendarAccessService.requireWritable(calendarId, userId);

        Schedule schedule = getTeamSchedule(scheduleId, calendarId);
        requireMatchingVersion(baseVersion, schedule.getVersion());
        scheduleRepository.delete(schedule);

        try {
            scheduleRepository.flush();
        } catch (ObjectOptimisticLockingFailureException e) {
            throw buildVersionConflict(scheduleId);
        }

        publishEvent("DELETED", calendarId, scheduleId, userId);
    }

    private Schedule getTeamSchedule(Long scheduleId, Long calendarId) {
        Schedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new IllegalArgumentException("일정 없음"));

        if (!schedule.getCalendar().getId().equals(calendarId)) {
            throw new IllegalArgumentException("일정과 캘린더가 일치하지 않습니다.");
        }

        return schedule;
    }

    private Integer resolvePriority(Integer priority) {
        if (priority == null) {
            return 2;
        }

        if (priority < 0 || priority > 4) {
            throw new IllegalArgumentException("priority 범위는 0~4 입니다.");
        }

        return priority;
    }

    private void requireMatchingVersion(Long baseVersion, Long latestVersion) {
        if (baseVersion == null) {
            throw new IllegalArgumentException("baseVersion 값이 필요합니다.");
        }
        if (!baseVersion.equals(latestVersion)) {
            throw new TeamScheduleVersionConflictException(latestVersion);
        }
    }


    private TeamScheduleVersionConflictException buildVersionConflict(Long scheduleId) {
        Long latestVersion = scheduleRepository.findById(scheduleId)
                .map(Schedule::getVersion)
                .orElse(null);
        return new TeamScheduleVersionConflictException(latestVersion);
    }

    private void publishEvent(String action, Long calendarId, Long scheduleId, Long userId) {
        try {
            java.util.Map<String, Object> payload = new java.util.LinkedHashMap<>();
            payload.put("action", action);
            payload.put("calendarId", calendarId);
            payload.put("scheduleId", scheduleId);
            payload.put("actorUserId", userId);
            payload.put("timestamp", java.time.LocalDateTime.now().toString());
            redisPublisher.publish("schedule:updates", payload);
        } catch (Exception ignored) {
            // pub/sub 실패는 비즈니스 처리에 영향주지 않음
        }
    }

    private Long resolveMemoId(User user, Long memoId) {
        if (memoId == null) {
            return null;
        }

        memoPostRepository.findByIdAndUser(memoId, user)
                .orElseThrow(() -> new IllegalArgumentException("본인 메모가 아닙니다."));

        return memoId;
    }
}
