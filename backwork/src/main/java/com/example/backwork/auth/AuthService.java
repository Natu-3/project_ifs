 package com.example.backwork.auth;

 import com.example.backwork.member.User;
 import com.example.backwork.member.UserRepository;
 import lombok.RequiredArgsConstructor;
 import org.springframework.stereotype.Service;

 @Service
 @RequiredArgsConstructor
 public class AuthService {
     private final UserRepository userRepository;

     public LoginResponse login(LoginRequest request){
         User user = userRepository.findByUserid(request.getUserid())
                 .orElseThrow(() -> new IllegalArgumentException(("존재하지 않는 사용자")));

         if(!user.getPassword().equals(request.getPassword())){
             throw new IllegalArgumentException("비밀번호 불일치");
         }

         return new LoginResponse(
           user.getId(),
           user.getUserid(),
           user.getAuth()
         );
     }
 }
