package com.example.backwork.calendar;

import com.example.backwork.member.SessionUser;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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

    public ResponseEntity<List<CalendarResponse>> getTeamCalendars(HttpServletRequest httpRequest) {
        SessionUser user = getLoginUser(httpRequest);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        return ResponseEntity.ok(calendarService.getTeamCalendars(user.getId()));
    }
    
    // 팀 캘린더 생성
    @PostMapping
    public ResponseEntity<CalendarResponse> createTeamCalendar(
            @RequestBody CalendarRequest request,
            HttpServletRequest httpRequest
    ) {
        SessionUser user = getLoginUser(httpRequest);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        return ResponseEntity.ok(calendarService.createTeamCalendar(user.getId(), request));
    }


    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTeamCalendar(
            @PathVariable Long id,
            HttpServletRequest httpRequest
    ) {
        SessionUser user = getLoginUser(httpRequest);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        calendarService.deleteTeamCalendar(id, user.getId());
        return ResponseEntity.ok().build();
    }

    private SessionUser getLoginUser(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) return null;
        return (SessionUser) session.getAttribute("LOGIN_USER");
    }
}
