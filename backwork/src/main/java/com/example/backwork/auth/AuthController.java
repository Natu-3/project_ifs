package com.example.backwork.auth;

import com.example.backwork.member.CustomUserDetails;
import com.example.backwork.member.User;
import com.example.backwork.member.dto.UserMeResponse;
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
@RequiredArgsConstructor
public class AuthController {
    //private final AuthenticationConfiguration authenticationConfiguration;

   // private final AuthenticationManager authenticationManager;
    private final AuthService authService;
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
            @RequestBody LoginRequest request,
            HttpServletRequest httpRequest
    ) {
        User user = authService.login(request);

        HttpSession session = httpRequest.getSession(true);
        session.setAttribute("LOGIN_USER", user);


//        ResponseCookie cookie = ResponseCookie.from("ACCESS_TOKEN", result.getAccessToken())
//                .httpOnly(true)
//                .path("/")
//                .maxAge(60 * 30)
//                .sameSite("Lax")
//                .build();

       // response.addHeader("Set-Cookie", cookie.toString());

        //User user = result.getUser();

        return ResponseEntity.ok(
                new LoginResponse(
                        user.getId(),
                        user.getUserid(),
                        user.getAuth()
                       // result.getDevToken()
                )
        );
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody SignupRequest request) {
        return ResponseEntity.ok(authService.singup(request));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }

        CustomUserDetails user =
                (CustomUserDetails) authentication.getPrincipal();

        assert user != null;
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
