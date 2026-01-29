package com.example.backwork.auth;

import lombok.Getter;
import lombok.AllArgsConstructor;

// 로그인에 대해 돌려줘야 할 정보들 객체 dto

public class LoginResponse {
    private Long memberId;
    private String userid;
    private String auth;
}

