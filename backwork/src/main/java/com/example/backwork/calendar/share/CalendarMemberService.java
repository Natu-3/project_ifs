package com.example.backwork.calendar.share;

import com.example.backwork.calendar.Calendar;
import com.example.backwork.calendar.CalendarRepository;
import com.example.backwork.member.User;
import com.example.backwork.member.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class CalendarMemberService {

    private final ShareMemberRepository shareMemberRepository;
    private final CalendarRepository calendarRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<CalendarMemberResponse> getMembers(Long calendarId, Long actorUserId) {
        Calendar calendar = getCalendarOrThrow(calendarId);
        validateOwnerAccess(calendar, actorUserId);

        return shareMemberRepository.findByCalendarId(calendarId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public CalendarMemberResponse addMember(Long calendarId, Long actorUserId, String userIdentifier, RoleRw roleRw) {
        if (userIdentifier == null || userIdentifier.isBlank()) {
            throw new IllegalArgumentException("멤버 식별자는 필수입니다");
        }
        if (roleRw == null) {
            throw new IllegalArgumentException("role_rw 값은 필수입니다");
        }

        Calendar calendar = getCalendarOrThrow(calendarId);
        validateOwnerAccess(calendar, actorUserId);

        User member = userRepository.findByUserid(userIdentifier)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다"));

        if (member.getId().equals(calendar.getOwner().getId())) {
            throw new IllegalArgumentException("owner는 공유 멤버로 추가할 수 없습니다");
        }

        if (shareMemberRepository.existsByCalendarIdAndUserId(calendarId, member.getId())) {
            throw new IllegalStateException("이미 추가된 멤버입니다");
        }

        ShareMember saved = shareMemberRepository.save(new ShareMember(calendarId, member.getId(), roleRw));
        return CalendarMemberResponse.from(saved, member.getUserid());
    }

    public CalendarMemberResponse updateMemberRole(Long calendarId, Long actorUserId, Long memberUserId, RoleRw roleRw) {
        if (roleRw == null) {
            throw new IllegalArgumentException("role_rw 값은 필수입니다");
        }

        Calendar calendar = getCalendarOrThrow(calendarId);
        validateOwnerAccess(calendar, actorUserId);

        if (calendar.getOwner().getId().equals(memberUserId)) {
            throw new IllegalArgumentException("owner 권한은 멤버 API에서 변경할 수 없습니다");
        }

        userRepository.findById(memberUserId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다"));

        ShareMember shareMember = shareMemberRepository.findByCalendarIdAndUserId(calendarId, memberUserId)
                .orElseThrow(() -> new IllegalArgumentException("공유 멤버를 찾을 수 없습니다"));

        shareMember.updateRole(roleRw);
        return toResponse(shareMember);
    }

    public void removeMember(Long calendarId, Long actorUserId, Long memberUserId) {
        Calendar calendar = getCalendarOrThrow(calendarId);
        validateOwnerAccess(calendar, actorUserId);

        if (calendar.getOwner().getId().equals(memberUserId)) {
            throw new IllegalArgumentException("owner는 멤버 API에서 제거할 수 없습니다");
        }

        userRepository.findById(memberUserId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다"));

        if (!shareMemberRepository.existsByCalendarIdAndUserId(calendarId, memberUserId)) {
            throw new IllegalArgumentException("공유 멤버를 찾을 수 없습니다");
        }

        shareMemberRepository.deleteByCalendarIdAndUserId(calendarId, memberUserId);
    }

    private Calendar getCalendarOrThrow(Long calendarId) {
        return calendarRepository.findById(calendarId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 캘린더입니다"));
    }

    private void validateOwnerAccess(Calendar calendar, Long actorUserId) {
        if (!"TEAM".equals(calendar.getType())) {
            throw new IllegalArgumentException("팀 캘린더에서만 멤버를 관리할 수 있습니다");
        }
        if (!calendar.getOwner().getId().equals(actorUserId)) {
            throw new IllegalArgumentException("캘린더 owner만 멤버를 관리할 수 있습니다");
        }
    }

    private CalendarMemberResponse toResponse(ShareMember shareMember) {
        String userIdentifier = userRepository.findById(shareMember.getUserId())
                .map(User::getUserid)
                .orElse("unknown");

        return CalendarMemberResponse.from(shareMember, userIdentifier);
    }
}