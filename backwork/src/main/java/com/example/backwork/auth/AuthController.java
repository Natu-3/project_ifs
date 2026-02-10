package com.example.backwork.auth;

import com.example.backwork.member.CustomUserDetails;
import com.example.backwork.member.SessionUser;
import com.example.backwork.member.User;
import com.example.backwork.member.dto.UserMeResponse;
import com.example.backwork.auth.UpdateUserRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
@RequiredArgsConstructor
public class AuthController {
    //private final AuthenticationConfiguration authenticationConfiguration;

   // private final AuthenticationManager authenticationManager;
    private final AuthService authService;
    @PostMapping("/login")
    public ResponseEntity<?> login(
            @RequestBody LoginRequest request,
            HttpServletRequest httpRequest
    ) {
        try {
            User user = authService.login(request);

            // auth 필드가 null인 경우 기본값 설정
            String auth = user.getAuth();
            if (auth == null || auth.trim().isEmpty()) {
                auth = "USER";
                user.setAuth(auth);
            }

            HttpSession session = httpRequest.getSession(true);
            session.setAttribute("LOGIN_USER",
                    new SessionUser(
                            user.getId(),
                            user.getUserid(),
                            auth
                    )
            );

            return ResponseEntity.ok(
                    new LoginResponse(
                            user.getId(),
                            user.getUserid(),
                            auth
                    )
            );
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(400)
                    .body(new ErrorResponse(e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500)
                    .body(new ErrorResponse("로그인 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody SignupRequest request) {
        try {
            return ResponseEntity.ok(authService.singup(request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(400)
                    .body(new ErrorResponse(e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500)
                    .body(new ErrorResponse("회원가입 중 오류가 발생했습니다: " + e.getMessage()));
        }
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

        SessionUser sessionUser = (SessionUser) session.getAttribute("LOGIN_USER");
        if (sessionUser == null) {
            return ResponseEntity.status(401).build();
        }

        try {
            // 실제 User 객체를 가져와서 name과 email 포함
            User user = authService.getUserById(sessionUser.getId());
            if (user == null) {
                return ResponseEntity.status(401).build();
            }

            return ResponseEntity.ok(
                    new UserMeResponse(
                            user.getId(),
                            user.getUserid(),
                            user.getAuth(),
                            user.getName() != null ? user.getName() : "",
                            user.getEmail() != null ? user.getEmail() : ""
                    )
            );
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
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

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(
            @RequestParam Long userId,
            @RequestBody UpdateUserRequest request
    ) {
        return ResponseEntity.ok(authService.updateUser(userId, request));
    }
}
