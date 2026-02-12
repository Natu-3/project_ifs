package com.example.backwork.teamsch.service;

import com.example.backwork.calendar.Calendar;
import com.example.backwork.calendar.share.TeamCalendarAccessService;
import com.example.backwork.member.User;
import com.example.backwork.member.UserRepository;
import com.example.backwork.memo.MemoPost;
import com.example.backwork.memo.MemoPostRepository;
import com.example.backwork.redis.RedisPublisher;
import com.example.backwork.schedule.entity.Schedule;
import com.example.backwork.schedule.repository.ScheduleRepository;
import com.example.backwork.teamsch.dto.TeamScheduleUpdateRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TeamScheduleServiceTest {

    @Mock
    private ScheduleRepository scheduleRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private MemoPostRepository memoPostRepository;
    @Mock
    private TeamCalendarAccessService teamCalendarAccessService;
    @Mock
    private RedisPublisher redisPublisher;

    private TeamScheduleService teamScheduleService;

    @BeforeEach
    void setUp() {
        teamScheduleService = new TeamScheduleService(
                scheduleRepository,
                userRepository,
                memoPostRepository,
                teamCalendarAccessService,
                redisPublisher
        );
    }

    @Test
    void team_update_allows_when_memoid_unchanged_even_if_not_owned() {
        Fixture fixture = fixture(11L, 1L, 200L);
        TeamScheduleUpdateRequest request = updateRequest(11L, 200L, 1L);

        Schedule updated = teamScheduleService.update(1L, 77L, request);

        assertEquals(200L, updated.getMemoId());
        assertEquals("updated-title", updated.getTitle());
        verify(memoPostRepository, never()).findByIdAndUser(anyLong(), any(User.class));
        verify(scheduleRepository).flush();
    }

    @Test
    void team_update_allows_detach_memoid_to_null() {
        fixture(11L, 1L, 200L);
        TeamScheduleUpdateRequest request = updateRequest(11L, null, 1L);

        Schedule updated = teamScheduleService.update(1L, 77L, request);

        assertNull(updated.getMemoId());
        verify(memoPostRepository, never()).findByIdAndUser(anyLong(), any(User.class));
        verify(scheduleRepository).flush();
    }

    @Test
    void team_update_rejects_when_change_to_foreign_memoid() {
        fixture(11L, 1L, 200L);
        TeamScheduleUpdateRequest request = updateRequest(11L, 300L, 1L);
        when(memoPostRepository.findByIdAndUser(eq(300L), any(User.class))).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> teamScheduleService.update(1L, 77L, request));
    }

    @Test
    void team_update_allows_when_change_to_own_memoid() {
        fixture(11L, 1L, 200L);
        TeamScheduleUpdateRequest request = updateRequest(11L, 400L, 1L);
        when(memoPostRepository.findByIdAndUser(eq(400L), any(User.class)))
                .thenReturn(Optional.of(new MemoPost()));

        Schedule updated = teamScheduleService.update(1L, 77L, request);

        assertEquals(400L, updated.getMemoId());
        verify(memoPostRepository).findByIdAndUser(eq(400L), any(User.class));
        verify(scheduleRepository).flush();
    }

    @Test
    void team_update_keeps_version_conflict_behavior() {
        User user = new User("user-1", "pw");
        ReflectionTestUtils.setField(user, "id", 1L);
        Calendar calendar = new Calendar("team", "TEAM", user);
        ReflectionTestUtils.setField(calendar, "id", 11L);
        Schedule schedule = new Schedule(
                calendar,
                user,
                "original",
                "content",
                LocalDateTime.of(2026, 2, 12, 0, 0),
                LocalDateTime.of(2026, 2, 12, 23, 59, 59),
                200L,
                2
        );
        ReflectionTestUtils.setField(schedule, "id", 77L);
        ReflectionTestUtils.setField(schedule, "version", 1L);
        when(teamCalendarAccessService.requireWritable(11L, 1L)).thenReturn(calendar);
        when(scheduleRepository.findById(77L)).thenReturn(Optional.of(schedule));

        TeamScheduleUpdateRequest request = updateRequest(11L, 200L, 999L);

        assertThrows(TeamScheduleVersionConflictException.class, () -> teamScheduleService.update(1L, 77L, request));
    }

    private Fixture fixture(Long calendarId, Long userId, Long existingMemoId) {
        User user = new User("user-" + userId, "pw");
        ReflectionTestUtils.setField(user, "id", userId);

        Calendar calendar = new Calendar("team", "TEAM", user);
        ReflectionTestUtils.setField(calendar, "id", calendarId);

        Schedule schedule = new Schedule(
                calendar,
                user,
                "original",
                "content",
                LocalDateTime.of(2026, 2, 12, 0, 0),
                LocalDateTime.of(2026, 2, 12, 23, 59, 59),
                existingMemoId,
                2
        );
        ReflectionTestUtils.setField(schedule, "id", 77L);
        ReflectionTestUtils.setField(schedule, "version", 1L);

        when(teamCalendarAccessService.requireWritable(calendarId, userId)).thenReturn(calendar);
        when(scheduleRepository.findById(77L)).thenReturn(Optional.of(schedule));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        return new Fixture(user, calendar, schedule);
    }

    private TeamScheduleUpdateRequest updateRequest(Long calendarId, Long memoId, Long baseVersion) {
        TeamScheduleUpdateRequest request = new TeamScheduleUpdateRequest();
        ReflectionTestUtils.setField(request, "calendarId", calendarId);
        ReflectionTestUtils.setField(request, "title", "updated-title");
        ReflectionTestUtils.setField(request, "content", "updated-content");
        ReflectionTestUtils.setField(request, "startAt", LocalDateTime.of(2026, 2, 13, 0, 0));
        ReflectionTestUtils.setField(request, "endAt", LocalDateTime.of(2026, 2, 13, 23, 59, 59));
        ReflectionTestUtils.setField(request, "memoId", memoId);
        ReflectionTestUtils.setField(request, "priority", 2);
        ReflectionTestUtils.setField(request, "baseVersion", baseVersion);
        return request;
    }

    private record Fixture(User user, Calendar calendar, Schedule schedule) {
    }
}
