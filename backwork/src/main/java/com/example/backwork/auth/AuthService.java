 package com.example.backwork.auth;

 import com.example.backwork.member.Member;
 import com.example.backwork.member.MemberRepository;
 import lombok.RequiredArgsConstructor;
 import org.springframework.stereotype.Service;

 @Service
 @RequiredArgsConstructor
 public class AuthService {
     private final MemberRepository memberRepository;

     public LoginResponse login(LoginRequest request){
         Member member =memberRepository.findByUserid(request.getUserid())
                 .orElseThrow(() -> new IllegalArgumentException(("존재하지 않는 사용자")));

         if(!member.getPasswordHash().equals(request.getPassword_hash())){
             throw new IllegalArgumentException("비밀번호 불일치");
         }

         return new LoginResponse(
           member.getId(),
           member.getUserid(),
           member.getAuth()
         );
     }
 }
