package com.example.backwork.schedule.service;

import com.example.backwork.calendar.Calendar;
import com.example.backwork.calendar.CalendarRepository;
import com.example.backwork.member.User;
import com.example.backwork.member.UserRepository;
import com.example.backwork.memo.MemoPostRepository;
import com.example.backwork.schedule.dto.ScheduleCreateRequest;
import com.example.backwork.schedule.dto.ScheduleUpdateRequest;
import com.example.backwork.schedule.entity.Schedule;
import com.example.backwork.schedule.repository.ScheduleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ScheduleService {
    private final ScheduleRepository scheduleRepository;
    private final CalendarRepository calendarRepository;
    private final UserRepository userRepository;
    private final MemoPostRepository memoPostRepository;

    //일정 생성
    public Schedule create(Long userId, ScheduleCreateRequest request){

        User user = userRepository.findById(userId).orElseThrow();

        Calendar calendar =
                calendarRepository
                        .findByOwnerIdAndType(userId, "PERSONAL")
                        .orElseThrow(() ->
                                new IllegalStateException("개인 캘린더 없음")
                        );

        return scheduleRepository.save(
                new Schedule(
                        calendar,
                        user,
                        request.getTitle(),
                        request.getContent(),
                        request.getStartAt(),
                        request.getEndAt(),
                        resolveMemoId(user, request.getMemoId()),
                        resolvePriority(request.getPriority())
                )
        );
    }

    //월별 일정 조회
    public List<Schedule> findByMonth(
            Long userId,
            LocalDateTime start,
            LocalDateTime end
    ) {
        List<Schedule> rangedSchedules = scheduleRepository
                .findByOwnerIdAndStartAtLessThanEqualAndEndAtGreaterThanEqual(userId, end, start);

        List<Schedule> singleDaySchedules = scheduleRepository
                .findByOwnerIdAndEndAtIsNullAndStartAtBetween(userId, start, end);

        Map<Long, Schedule> uniqueSchedules = new LinkedHashMap<>();
        rangedSchedules.forEach(schedule -> uniqueSchedules.put(schedule.getId(), schedule));
        singleDaySchedules.forEach(schedule -> uniqueSchedules.put(schedule.getId(), schedule));

        return new ArrayList<>(uniqueSchedules.values());
    }

    //일정 수정
    @Transactional
    public Schedule update(
            Long userId,
            Long scheduleId,
            ScheduleUpdateRequest request
    ) {
        Schedule schedule = getOwnedSchedule(userId, scheduleId);

        schedule.update(
                request.getTitle(),
                request.getContent(),
                request.getStartAt(),
                request.getEndAt(),
                resolveMemoId(userRepository.findById(userId).orElseThrow(), request.getMemoId()),
                resolvePriority(request.getPriority())
        );

        return schedule;
    }

    // 메모 우선순위
    private Integer resolvePriority(Integer priority) {
        if (priority == null) {
            return 2;
        }

        if (priority < 0 || priority > 4) {
            throw new IllegalArgumentException("priority 범위는 0~4 입니다.");
        }

        return priority;
    }



    // memoid 인증과정
    private Long resolveMemoId(User user, Long memoId) {
        if (memoId == null) {
            return null;
        }

        memoPostRepository.findByIdAndUser(memoId, user)
                .orElseThrow(() -> new IllegalArgumentException("본인 메모가 아닙니다."));

        return memoId;
    }

    //일정 삭제
    public void delete(Long userId, Long scheduleId) {
        Schedule schedule = getOwnedSchedule(userId, scheduleId);
        scheduleRepository.delete(schedule);
    }

    // 공통 일정인지 확인
    private Schedule getOwnedSchedule(Long userId, Long scheduleId) {
        Schedule schedule =
                scheduleRepository.findById(scheduleId)
                        .orElseThrow(() ->
                                new IllegalArgumentException("일정 없음")
                        );

        if (!schedule.getOwner().getId().equals(userId)) {
            throw new SecurityException("권한 없음");
        }

        return schedule;
    }
}
