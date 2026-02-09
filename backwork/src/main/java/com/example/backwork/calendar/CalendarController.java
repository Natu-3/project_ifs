package com.example.backwork.calendar;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/team-calendars")
@RequiredArgsConstructor
public class CalendarController {
    
    private final CalendarService calendarService;
    
    // 팀 캘린더 목록 조회
    @GetMapping
    public ResponseEntity<List<CalendarResponse>> getTeamCalendars(
        @RequestParam Long userId
    ) {
        return ResponseEntity.ok(calendarService.getTeamCalendars(userId));
    }
    
    // 팀 캘린더 생성
    @PostMapping
    public ResponseEntity<CalendarResponse> createTeamCalendar(
        @RequestParam Long userId,
        @RequestBody CalendarRequest request
    ) {
        return ResponseEntity.ok(calendarService.createTeamCalendar(userId, request));
    }
    
    // 팀 캘린더 삭제
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTeamCalendar(
        @PathVariable Long id,
        @RequestParam Long userId
    ) {
        calendarService.deleteTeamCalendar(id, userId);
        return ResponseEntity.ok().build();
    }
}

