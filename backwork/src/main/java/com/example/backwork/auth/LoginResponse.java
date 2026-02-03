 package com.example.backwork.auth;

 import com.example.backwork.member.User;
 import lombok.Getter;
 import lombok.AllArgsConstructor;
 import lombok.RequiredArgsConstructor;
 import lombok.Setter;
 import org.springframework.stereotype.Service;

 // 로그인에 대해 돌려줘야 할 정보들 객체 dto
 @Getter
 @Setter
 @AllArgsConstructor
 public class LoginResponse{
     private Long id;
     private String userid;
     private String auth;
     private String devToken;
 }

