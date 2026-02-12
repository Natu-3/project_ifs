package com.example.backwork.calendar.share;

import lombok.RequiredArgsConstructor;
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
            @RequestParam Long userId
    ) {
        return ResponseEntity.ok(calendarMemberService.getMembers(calendarId, userId));
    }

    @PostMapping
    public ResponseEntity<CalendarMemberResponse> addMember(
            @PathVariable Long calendarId,
            @RequestParam Long userId,
            @RequestBody CalendarMemberCreateRequest request
    ) {
        CalendarMemberResponse response = calendarMemberService.addMember(
                calendarId,
                userId,
                request.getUserIdentifier(),
                request.getRoleRw()
        );
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{memberUserId}/role")
    public ResponseEntity<CalendarMemberResponse> updateRole(
            @PathVariable Long calendarId,
            @PathVariable Long memberUserId,
            @RequestParam Long userId,
            @RequestBody CalendarMemberRoleUpdateRequest request
    ) {
        CalendarMemberResponse response = calendarMemberService.updateMemberRole(
                calendarId,
                userId,
                memberUserId,
                request.getRoleRw()
        );

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{memberUserId}")
    public ResponseEntity<Void> removeMember(
            @PathVariable Long calendarId,
            @PathVariable Long memberUserId,
            @RequestParam Long userId
    ) {
        calendarMemberService.removeMember(calendarId, userId, memberUserId);
        return ResponseEntity.ok().build();
    }
}