package com.example.backwork.calendar.share;

import com.example.backwork.member.SessionUser;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/team-calendars/{calendarId}/members")
@RequiredArgsConstructor
public class CalendarMemberController {

    private final CalendarMemberService calendarMemberService;

    @GetMapping
    public ResponseEntity<List<CalendarMemberResponse>> getMembers(
            @PathVariable Long calendarId,
            HttpServletRequest httpRequest
    ) {
        SessionUser user = getLoginUser(httpRequest);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        return ResponseEntity.ok(calendarMemberService.getMembers(calendarId, user.getId()));
    }

    @PostMapping
    public ResponseEntity<CalendarMemberResponse> addMember(
            @PathVariable Long calendarId,
            @RequestBody CalendarMemberCreateRequest request,
            HttpServletRequest httpRequest
    ) {
        SessionUser user = getLoginUser(httpRequest);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();


        CalendarMemberResponse response = calendarMemberService.addMember(
                calendarId,
                user.getId(),
                request.getUserIdentifier(),
                request.getRoleRw()
        );
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{memberUserId}/role")
    public ResponseEntity<CalendarMemberResponse> updateRole(
            @PathVariable Long calendarId,
            @PathVariable Long memberUserId,
            @RequestBody CalendarMemberRoleUpdateRequest request,
            HttpServletRequest httpRequest
    ) {
        SessionUser user = getLoginUser(httpRequest);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        CalendarMemberResponse response = calendarMemberService.updateMemberRole(
                calendarId,
                user.getId(),
                memberUserId,
                request.getRoleRw()
        );

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{memberUserId}")
    public ResponseEntity<Void> removeMember(
            @PathVariable Long calendarId,
            @PathVariable Long memberUserId,
            HttpServletRequest httpRequest
    ) {
        SessionUser user = getLoginUser(httpRequest);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        calendarMemberService.removeMember(calendarId, user.getId(), memberUserId);
        return ResponseEntity.ok().build();
    }
    private SessionUser getLoginUser(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) return null;
        return (SessionUser) session.getAttribute("LOGIN_USER");
    }
}