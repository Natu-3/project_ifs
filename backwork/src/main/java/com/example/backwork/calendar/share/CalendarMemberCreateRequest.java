package com.example.backwork.calendar.share;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class CalendarMemberCreateRequest {

    private String userIdentifier;
    private RoleRw roleRw;
}