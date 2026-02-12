package com.example.backwork.calendar.share;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class CalendarMemberResponse {

    private Long userId;
    private String userIdentifier;
    private RoleRw roleRw;
    private LocalDateTime joinedAt;

    public static CalendarMemberResponse from(ShareMember shareMember, String userIdentifier) {
        return CalendarMemberResponse.builder()
                .userId(shareMember.getUserId())
                .userIdentifier(userIdentifier)
                .roleRw(shareMember.getRoleRw())
                .joinedAt(shareMember.getJoinedAt())
                .build();
    }
}