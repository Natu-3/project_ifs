 package com.example.backwork.auth;

 import com.example.backwork.LoginResult;
 import com.example.backwork.auth.jwt.JwtProvider;
 import com.example.backwork.member.User;
 import com.example.backwork.member.UserRepository;
 import lombok.RequiredArgsConstructor;
 import org.springframework.security.crypto.password.PasswordEncoder;
 import org.springframework.stereotype.Service;

 @Service
 @RequiredArgsConstructor
 public class AuthService {
     private final UserRepository userRepository;
     private final JwtProvider jwtProvider;
     private final PasswordEncoder passwordEncoder;

     public LoginResult login(LoginRequest request){
         // 사용자 정보 유저테이블에서 찾기
         User user = userRepository.findByUserid(request.getUserid())
                 .orElseThrow(() -> new IllegalArgumentException(("존재하지 않는 사용자")));
         //비밀번호 일치 확인 로직
         if(!user.getPassword().equals(request.getPassword())){
             throw new IllegalArgumentException("비밀번호 불일치");
         }
        // 토큰 발급부, 여기서 발급할때 쿠키로 보내기 위한 세팅 넣어야함


         // 실사용, 쿠키로 보낼 토큰
         String accessToken = jwtProvider.createAccessToken(user);

         //임시사용, 유저정보 받아오기 위한 로컬 스토리지 토큰, 추후 삭제예정!!!
         String devToken = JwtProvider.generateToken(
                 user.getId(),
                 user.getUserid(),
                 user.getAuth()
         );

         return new LoginResult(user,accessToken,devToken);

//        //로그인 정보 return (id, 유저id , 권한, 토큰)
//         return new LoginResponse(
//           user,devToken,accessToken
//         );
     }

//     public SignupResponse singup(SignupRequest request) {
//         userRepository.signup(request.getPassword());
//
//     }
 }
