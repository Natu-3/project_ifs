package com.example.backwork.rag;

import com.example.backwork.calendar.Calendar;
import com.example.backwork.calendar.CalendarRepository;
import com.example.backwork.calendar.share.RoleRw;
import com.example.backwork.calendar.share.ShareMember;
import com.example.backwork.calendar.share.ShareMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RagAccessService {

    private final CalendarRepository calendarRepository;
    private final ShareMemberRepository shareMemberRepository;

    public Calendar requireMember(Long calendarId, Long userId) {
        Calendar calendar = calendarRepository.findById(calendarId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 캘린더입니다."));

        if (calendar.getOwner().getId().equals(userId)) {
            return calendar;
        }

        if ("TEAM".equals(calendar.getType())) {
            boolean member = shareMemberRepository.existsByCalendarIdAndUserId(calendarId, userId);
            if (member) {
                return calendar;
            }
        }

        throw new SecurityException("문서 접근 권한이 없습니다.");
    }

    public Calendar requireWritable(Long calendarId, Long userId) {
        Calendar calendar = calendarRepository.findById(calendarId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 캘린더입니다."));

        if (calendar.getOwner().getId().equals(userId)) {
            return calendar;
        }

        if ("TEAM".equals(calendar.getType())) {
            ShareMember member = shareMemberRepository.findByCalendarIdAndUserId(calendarId, userId)
                    .orElseThrow(() -> new SecurityException("문서 쓰기 권한이 없습니다."));
            if (member.getRoleRw() == RoleRw.WRITE) {
                return calendar;
            }
        }

        throw new SecurityException("문서 쓰기 권한이 없습니다.");
    }
}
