package com.example.backwork.auth;

import lombok.Getter;
import lombok.AllArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

// 로그인에 대해 돌려줘야 할 정보들 객체 dto
@Getter
@AllArgsConstructor
public class LoginResponse (Long id, String userid, String auth){
    private Long memberId;
    private String userid;
    private String auth;

}

