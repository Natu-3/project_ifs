package com.example.backwork.calendar;

import com.example.backwork.calendar.share.ShareMember;
import com.example.backwork.calendar.share.ShareMemberRepository;
import com.example.backwork.member.User;
import com.example.backwork.member.UserRepository;
import com.example.backwork.assistant.dto.AssistantChatResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class CalendarService {
    
    private final CalendarRepository calendarRepository;
    private final UserRepository userRepository;
    private final ShareMemberRepository shareMemberRepository;
    
    // 사용자의 팀 캘린더 목록 조회
    public List<CalendarResponse> getTeamCalendars(Long userId) {
        //User user = userRepository.findById(userId)
        userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다"));
            
//        return calendarRepository
//            .findAllByOwnerIdAndType(userId, "TEAM")
//            .stream()
//            .map(CalendarResponse::from)
//            .collect(Collectors.toList());
        List<Calendar> ownedCalendars = calendarRepository.findAllByOwnerIdAndType(userId, "TEAM");
        List<ShareMember> memberships = shareMemberRepository.findByUserId(userId);
        List<Calendar> memberCalendars = calendarRepository.findSharedCalendarsByUserIdAndType(userId, "TEAM");

        Map<Long, CalendarResponse> calendarMap = new LinkedHashMap<>();

        // 소유 캘린더 우선 반영
        for (Calendar ownedCalendar : ownedCalendars) {
            calendarMap.put(ownedCalendar.getId(), CalendarResponse.from(ownedCalendar));
        }

        Map<Long, ShareMember> membershipMap = memberships.stream()
                .collect(Collectors.toMap(ShareMember::getCalendarId, membership -> membership, (left, right) -> left));

        for (Calendar memberCalendar : memberCalendars) {
            if (calendarMap.containsKey(memberCalendar.getId())) {
                continue;
            }

            ShareMember membership = membershipMap.get(memberCalendar.getId());
            if (membership != null) {
                calendarMap.put(memberCalendar.getId(), CalendarResponse.from(memberCalendar, membership.getRoleRw()));
            }
        }

        return List.copyOf(calendarMap.values());


    }

    @Transactional(readOnly = true)
    public List<AssistantChatResponse.CalendarOption> getAssistantCalendarOptions(Long userId) {
        List<AssistantChatResponse.CalendarOption> options = new java.util.ArrayList<>();
        options.add(new AssistantChatResponse.CalendarOption("PERSONAL", null, "개인 캘린더", true));

        List<CalendarResponse> teamCalendars = getTeamCalendars(userId);
        for (CalendarResponse team : teamCalendars) {
            boolean writable = "OWNER".equalsIgnoreCase(team.getCurrentUserRole())
                    || "WRITE".equalsIgnoreCase(team.getCurrentUserRole());
            options.add(new AssistantChatResponse.CalendarOption("TEAM", team.getId(), team.getName(), writable));
        }
        return options;
    }

    @Transactional(readOnly = true)
    public Long getPersonalCalendarId(Long userId) {
        return calendarRepository.findByOwnerIdAndType(userId, "PERSONAL")
                .map(Calendar::getId)
                .orElse(null);
    }
    
    // 팀 캘린더 생성
    public CalendarResponse createTeamCalendar(Long userId, CalendarRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다"));
        
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("팀 캘린더 이름은 필수입니다");
        }
        
        Calendar calendar = new Calendar(
            request.getName().trim(),
            "TEAM",
            user
        );
        
        Calendar saved = calendarRepository.save(calendar);
        // owner를 명시적으로 로드하여 LAZY 로딩 문제 방지
        saved.getOwner().getId(); // owner 로드
        
        return CalendarResponse.from(saved);
    }
    
    // 팀 캘린더 삭제
    public void deleteTeamCalendar(Long calendarId, Long userId) {
        //User user = userRepository.findById(userId)
        userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다"));
        
        Calendar calendar = calendarRepository.findByIdAndOwnerId(calendarId, userId)
            .orElseThrow(() -> new IllegalArgumentException("팀 캘린더를 찾을 수 없습니다"));
        
        // TEAM 타입인지 확인
        if (!"TEAM".equals(calendar.getType())) {
            throw new IllegalArgumentException("팀 캘린더만 삭제할 수 있습니다");
        }
        
        calendarRepository.delete(calendar);
    }
}

