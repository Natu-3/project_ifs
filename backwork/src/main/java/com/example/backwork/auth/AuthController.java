package com.example.backwork.auth;

import com.example.backwork.LoginResult;
import com.example.backwork.member.User;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.java.Log;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request,HttpServletResponse response) {

        System.out.println("login request: " + request.getUserid());
        LoginResult result = authService.login(request);
        //Login 결과값 = 쿠키로 보내지 않을 키값까지 저장함


        //쿠키 값 설정 부분
        ResponseCookie cookie = ResponseCookie.from("ACCESS_TOKEN", result.getAccessToken())
                .httpOnly(true)
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
}
