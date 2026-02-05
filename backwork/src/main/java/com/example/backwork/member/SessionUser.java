package com.example.backwork.member;

//jwt에선 서버기반 유저 적용하려 했기에 세션용 유저 객체로 별도 생성

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class SessionUser {
    private Long id;
    private String userid;
    private String auth;
}
