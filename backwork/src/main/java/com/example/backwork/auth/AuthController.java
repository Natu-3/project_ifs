package com.example.backwork.auth;

import com.example.backwork.member.CustomUserDetails;
import com.example.backwork.member.SessionUser;
import com.example.backwork.member.User;
import com.example.backwork.member.dto.UserMeResponse;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request,HttpServletResponse response) {

<<<<<<< HEAD
        HttpSession session = httpRequest.getSession(true);
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> ca0e1ad (사이드바 임시 저장)
        session.setAttribute("LOGIN_USER",
                new SessionUser(
                        user.getId(),
                        user.getUserid(),
                        user.getAuth()
                )

                );
<<<<<<< HEAD
=======
        session.setAttribute("LOGIN_USER", user);
>>>>>>> 3017083 (26.02.05 10:03 로그인 로그아웃 회원가입 세션 기반 스프링부트 로직 완성, 프론트 연결작업 진행중)
=======
>>>>>>> ca0e1ad (사이드바 임시 저장)
=======
        System.out.println("login request: " + request.getUserid());
        LoginResult result = authService.login(request);
        //Login 결과값 = 쿠키로 보내지 않을 키값까지 저장함
>>>>>>> e2f0487 (Revert "사이드바 중간 머지")


        //쿠키 값 설정 부분
        ResponseCookie cookie = ResponseCookie.from("ACCESS_TOKEN", result.getAccessToken())
                .httpOnly(true)
                .secure(false)
                .path("/")
                .maxAge(60 * 30)
                .sameSite("Lax")
                .build();
        response.addHeader("Set-Cookie", cookie.toString());

        User user = result.getUser();
        String dev = result.getDevToken();
        System.out.println(dev);

        // 리턴 - 로컬용 ID / UserID / 사용자 권한 / 임시토큰
        return ResponseEntity.ok(
                new LoginResponse(
                        user.getId(),
                        user.getUserid(),
                        user.getAuth(),
                        dev
                )
        );
    }

      //  return ResponseEntity.ok(authService.login(request));



    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody SignupRequest request){
        System.out.println("Sign up cleared");
                return ResponseEntity.ok(authService.singup(request));
    }
//    jwt 기반 구현했던것
//    @GetMapping("/me")
//    public ResponseEntity<?> me(Authentication authentication) {
//
//        if (authentication == null || !authentication.isAuthenticated()) {
//            return ResponseEntity.status(401).build();
//        }
//
//        CustomUserDetails user =
//                (CustomUserDetails) authentication.getPrincipal();
//
//        assert user != null;
//        return ResponseEntity.ok(
//                new UserMeResponse(
//                        user.getId(),
//                        user.getUserid(),
//                        user.getAuth()
//                )
//        );
//    }

    @GetMapping("/me")
    public ResponseEntity<?> me(HttpServletRequest request) {

        HttpSession session = request.getSession(false);
        if (session == null) {
            return ResponseEntity.status(401).build();
        }

        SessionUser user = (SessionUser) session.getAttribute("LOGIN_USER");
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
<<<<<<< HEAD

<<<<<<< HEAD
=======
        CustomUserDetails user =
                (CustomUserDetails) authentication.getPrincipal();

        assert user != null;
>>>>>>> 3017083 (26.02.05 10:03 로그인 로그아웃 회원가입 세션 기반 스프링부트 로직 완성, 프론트 연결작업 진행중)
=======

>>>>>>> ca0e1ad (사이드바 임시 저장)
        return ResponseEntity.ok(
                new UserMeResponse(
                        user.getId(),
                        user.getUserid(),
                        user.getAuth()
                )
        );
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok().build();
    }
}
