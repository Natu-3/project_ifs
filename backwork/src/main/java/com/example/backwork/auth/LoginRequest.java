package com.example.backwork.auth;

import lombok.Getter;
// 유저 id 받아오는 형태 객체 (dto)
// 이후 pw는 암호화 시켜야함
@Getter
public class LoginRequest {
    private  String userid;
    private String password;
}
