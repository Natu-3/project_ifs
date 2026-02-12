package com.example.backwork.calendar.share;

import com.example.backwork.calendar.Calendar;
import com.example.backwork.calendar.CalendarRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TeamCalendarAccessService {

    private final CalendarRepository calendarRepository;
    private final ShareMemberRepository shareMemberRepository;

    public Calendar requireMember(Long calendarId, Long userId) {
        Calendar calendar = getTeamCalendar(calendarId);
        if (isOwner(calendar, userId)) {
            return calendar;
        }

        if (!shareMemberRepository.existsByCalendarIdAndUserId(calendarId, userId)) {
            throw new SecurityException("팀 캘린더 접근 권한이 없습니다.");
        }

        return calendar;
    }

    public Calendar requireWritable(Long calendarId, Long userId) {
        Calendar calendar = getTeamCalendar(calendarId);
        if (isOwner(calendar, userId)) {
            return calendar;
        }

        ShareMember member = shareMemberRepository.findByCalendarIdAndUserId(calendarId, userId)
                .orElseThrow(() -> new SecurityException("팀 캘린더 접근 권한이 없습니다."));

        if (member.getRoleRw() != RoleRw.WRITE) {
            throw new SecurityException("쓰기 권한이 없습니다.");
        }

        return calendar;
    }

    private Calendar getTeamCalendar(Long calendarId) {
        Calendar calendar = calendarRepository.findById(calendarId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 캘린더입니다."));

        if (!"TEAM".equals(calendar.getType())) {
            throw new IllegalArgumentException("팀 캘린더가 아닙니다.");
        }
        return calendar;
    }

    private boolean isOwner(Calendar calendar, Long userId) {
        return calendar.getOwner().getId().equals(userId);
    }
}