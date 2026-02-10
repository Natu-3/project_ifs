package com.example.backwork.calendar;

import com.example.backwork.member.User;
import com.example.backwork.member.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class CalendarService {
    
    private final CalendarRepository calendarRepository;
    private final UserRepository userRepository;
    
    // 사용자의 팀 캘린더 목록 조회
    public List<CalendarResponse> getTeamCalendars(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다"));
            
        return calendarRepository
            .findAllByOwnerIdAndType(userId, "TEAM")
            .stream()
            .map(CalendarResponse::from)
            .collect(Collectors.toList());
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
        User user = userRepository.findById(userId)
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

