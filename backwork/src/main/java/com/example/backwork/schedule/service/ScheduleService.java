package com.example.backwork.schedule.service;

import com.example.backwork.calendar.Calendar;
import com.example.backwork.calendar.CalendarRepository;
import com.example.backwork.member.User;
import com.example.backwork.member.UserRepository;
import com.example.backwork.schedule.dto.ScheduleCreateRequest;
import com.example.backwork.schedule.dto.ScheduleUpdateRequest;
import com.example.backwork.schedule.entity.Schedule;
import com.example.backwork.schedule.repository.ScheduleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ScheduleService {
    private final ScheduleRepository scheduleRepository;
    private final CalendarRepository calendarRepository;
    private final UserRepository userRepository;

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
                        request.getEndAt()
                )
        );
    }

    //월별 일정 조회
    public List<Schedule> findByMonth(
            Long userId,
            LocalDateTime start,
            LocalDateTime end
    ) {
        return scheduleRepository
                .findByOwnerIdAndStartAtBetween(userId, start, end);
    }

    //일정 수정
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
                request.getEndAt()
        );

        return schedule;
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
