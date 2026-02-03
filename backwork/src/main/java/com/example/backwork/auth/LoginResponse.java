 package com.example.backwork.auth;

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
     private Long Id;
     private String userid;
     private String auth;
 }

