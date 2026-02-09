package com.example.backwork.calendar;

import lombok.AllArgsConstructor;
import lombok.Getter;
import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class CalendarResponse {
    private Long id;
    private String name;
    private String type;
    private Long ownerId;
    private LocalDateTime createdAt;
    
    public static CalendarResponse from(Calendar calendar) {
        // LAZY 로딩 문제 방지: owner를 먼저 접근하여 로딩
        Long ownerId = calendar.getOwner() != null ? calendar.getOwner().getId() : null;
        
        return new CalendarResponse(
            calendar.getId(),
            calendar.getName(),
            calendar.getType(),
            ownerId,
            calendar.getCreatedAt()
        );
    }
}

