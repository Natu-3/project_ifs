package com.example.backwork.teamsch.controller;

import com.example.backwork.member.SessionUser;
import com.example.backwork.schedule.dto.ScheduleResponse;
import com.example.backwork.schedule.entity.Schedule;
import com.example.backwork.teamsch.dto.TeamScheduleConflictResponse;
import com.example.backwork.teamsch.dto.TeamScheduleCreateRequest;
import com.example.backwork.teamsch.dto.TeamScheduleUpdateRequest;
import com.example.backwork.teamsch.service.TeamScheduleService;
import com.example.backwork.teamsch.service.TeamScheduleVersionConflictException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;

@RestController
@RequestMapping("/api/team-schedules")
@RequiredArgsConstructor
public class TeamScheduleController {

    private final TeamScheduleService teamScheduleService;

    @PostMapping
    public ResponseEntity<?> create(
            @RequestBody TeamScheduleCreateRequest request,
            HttpServletRequest httpRequest
    ) {
        SessionUser user = getLoginUser(httpRequest);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        Schedule schedule = teamScheduleService.create(user.getId(), request);
        return ResponseEntity.ok(new ScheduleResponse(schedule));
    }

    @GetMapping
    public ResponseEntity<?> monthSchedules(
            @RequestParam Long calendarId,
            @RequestParam int year,
            @RequestParam int month,
            HttpServletRequest httpRequest
    ) {
        SessionUser user = getLoginUser(httpRequest);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        YearMonth ym = YearMonth.of(year, month);
        LocalDateTime start = ym.atDay(1).atStartOfDay();
        LocalDateTime end = ym.atEndOfMonth().atTime(23, 59, 59);

        List<ScheduleResponse> schedules = teamScheduleService.findByMonth(user.getId(), calendarId, start, end)
                .stream()
                .map(ScheduleResponse::new)
                .toList();

        return ResponseEntity.ok(schedules);
    }

    @PutMapping("/{scheduleId}")
    public ResponseEntity<?> update(
            @PathVariable Long scheduleId,
            @RequestBody TeamScheduleUpdateRequest request,
            HttpServletRequest httpRequest
    ) {
        SessionUser user = getLoginUser(httpRequest);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        Schedule schedule = teamScheduleService.update(
                user.getId(),
                scheduleId,
                request
        );

        return ResponseEntity.ok(new ScheduleResponse(schedule));
    }

    @DeleteMapping("/{scheduleId}")
    public ResponseEntity<?> delete(
            @PathVariable Long scheduleId,
            @RequestParam Long calendarId,
            @RequestParam Long baseVersion,
            HttpServletRequest httpRequest
    ) {
        SessionUser user = getLoginUser(httpRequest);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        teamScheduleService.delete(user.getId(), calendarId, scheduleId, baseVersion);
        return ResponseEntity.ok().build();
    }

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<java.util.Map<String, Object>> handleSecurityException(SecurityException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(java.util.Map.of(
                        "code", "FORBIDDEN",
                        "message", e.getMessage()
                ));
    }
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<java.util.Map<String, Object>> handleIllegalArgumentException(IllegalArgumentException e) {
        return ResponseEntity.badRequest()
                .body(java.util.Map.of(
                        "code", "BAD_REQUEST",
                        "message", e.getMessage()
                ));
    }

    @ExceptionHandler(TeamScheduleVersionConflictException.class)
    public ResponseEntity<TeamScheduleConflictResponse> handleVersionConflict(
            TeamScheduleVersionConflictException e
    ) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new TeamScheduleConflictResponse(
                        "VERSION_CONFLICT",
                        e.getLatestVersion(),
                        e.getMessage()
                ));
    }

    private SessionUser getLoginUser(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) return null;
        return (SessionUser) session.getAttribute("LOGIN_USER");
    }
}

