// package com.example.backwork.auth;
//
// import com.example.backwork.auth.jwt.JwtProvider;
// import com.example.backwork.calendar.Calendar;
// import com.example.backwork.calendar.CalendarRepository;
// import com.example.backwork.member.User;
// import com.example.backwork.member.UserRepository;
// import lombok.RequiredArgsConstructor;
// import org.springframework.security.crypto.password.PasswordEncoder;
// import org.springframework.stereotype.Service;
//
// @Service
// @RequiredArgsConstructor
// public class AuthService_refactor {
//     private final UserRepository userRepository;
//     private final JwtProvider jwtProvider;
//     private final PasswordEncoder passwordEncoder;
//     private final CalendarRepository calendarRepository;
//
//     public LoginResult login(LoginRequest request){
//         // 사용자 정보 유저테이블에서 찾기
//         User user = userRepository.findByUserid(request.getUserid())
//                 .orElseThrow(() -> new IllegalArgumentException(("존재하지 않는 사용자")));
//         //비밀번호 일치 확인 로직
//         if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
//             throw new IllegalArgumentException("비밀번호 불일치");
//         }
//        // 토큰 발급부, 여기서 발급할때 쿠키로 보내기 위한 세팅 넣어야함
//
//
//         // 실사용, 쿠키로 보낼 토큰
//         String accessToken = jwtProvider.createAccessToken(user);
//
//         //임시사용, 유저정보 받아오기 위한 로컬 스토리지 토큰, 추후 삭제예정!!!
//         String devToken = JwtProvider.generateToken(
//                 user.getId(),
//                 user.getUserid(),
//                 user.getAuth()
//         );
//
//         return new LoginResult(user,accessToken,devToken);
//
////        //로그인 정보 return (id, 유저id , 권한, 토큰)
////         return new LoginResponse(
////           user,devToken,accessToken
////         );
//     }
//
//     public SignupResponse singup(SignupRequest request) {
//
//         if (userRepository.existsByUserid(request.getUserid())){
//             throw new IllegalArgumentException("이미 존재하는 userid");
//         }
////         if (userRepository.existsByEmail(request.getU())){
////             throw new IllegalArgumentException("이미 존재하는 이메일");
////         }
//
//         User user = new User(
//                 request.getUserid(),
//                 passwordEncoder.encode(request.getPassword())
//         );
//
//         User saveUser = userRepository.save(user);
//         Calendar personalCalendar = new Calendar(
//           "개인 캘린더",
//           "PERSONAL",
//           saveUser
//         );
//
//         calendarRepository.save(personalCalendar);
//
//
//         return  new SignupResponse(
//                 saveUser.getId(),
//                 saveUser.getUserid(),
//                 null,
//                 saveUser.getAuth()
//         );
//
//     }
// }
