package com.example.backwork.auth;

import com.example.backwork.member.User;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class LoginResult {
    private User user;
    private String accessToken; // 쿠키용 (실제 인증)
    private String devToken;    // 로컬스토리지 임시용
}