package com.example.backwork.schedule.controller;

import com.example.backwork.member.SessionUser;
import com.example.backwork.schedule.dto.ScheduleCreateRequest;
import com.example.backwork.schedule.dto.ScheduleResponse;
import com.example.backwork.schedule.dto.ScheduleUpdateRequest;
import com.example.backwork.schedule.entity.Schedule;
import com.example.backwork.schedule.service.ScheduleService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;

@RestController
@RequestMapping("/api/schedules")
@RequiredArgsConstructor
public class ScheduleController {

    private final ScheduleService scheduleService;

    // 일정 생성
    @PostMapping
    public ResponseEntity<?> create(
            @RequestBody ScheduleCreateRequest request,
            HttpServletRequest httpRequest
    ) {
        SessionUser user = getLoginUser(httpRequest);
        if (user == null) return ResponseEntity.status(401).build();

        Schedule schedule =
                scheduleService.create(user.getId(), request);

        return ResponseEntity.ok(new ScheduleResponse(schedule));
    }

    //월별 일정 조회 (캘린더용)
    @GetMapping
    public ResponseEntity<?> monthSchedules(
            @RequestParam int year,
            @RequestParam int month,
            HttpServletRequest httpRequest
    ) {
        SessionUser user = getLoginUser(httpRequest);
        if (user == null) return ResponseEntity.status(401).build();

        YearMonth ym = YearMonth.of(year, month);
        LocalDateTime start = ym.atDay(1).atStartOfDay();
        LocalDateTime end = ym.atEndOfMonth().atTime(23, 59, 59);

        List<ScheduleResponse> schedules =
                scheduleService.findByMonth(user.getId(), start, end)
                        .stream()
                        .map(ScheduleResponse::new)
                        .toList();

        return ResponseEntity.ok(schedules);
    }

    //일정 수정
    @PutMapping("/{scheduleId}")
    public ResponseEntity<?> update(
            @PathVariable Long scheduleId,
            @RequestBody ScheduleUpdateRequest request,
            HttpServletRequest httpRequest
    ) {
        SessionUser user = getLoginUser(httpRequest);
        if (user == null) return ResponseEntity.status(401).build();

        Schedule schedule =
                scheduleService.update(
                        user.getId(),
                        scheduleId,
                        request
                );

        return ResponseEntity.ok(new ScheduleResponse(schedule));
    }

    //일정 삭제
    @DeleteMapping("/{scheduleId}")
    public ResponseEntity<?> delete(
            @PathVariable Long scheduleId,
            HttpServletRequest httpRequest
    ) {
        SessionUser user = getLoginUser(httpRequest);
        if (user == null) return ResponseEntity.status(401).build();

        scheduleService.delete(user.getId(), scheduleId);
        return ResponseEntity.ok().build();
    }

    private SessionUser getLoginUser(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) return null;
        return (SessionUser) session.getAttribute("LOGIN_USER");
    }
}
