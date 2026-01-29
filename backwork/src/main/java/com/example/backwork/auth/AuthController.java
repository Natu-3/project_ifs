package com.example.backwork.auth;

import com.example.backwork.member.Member;
import com.example.backwork.member.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.example.backwork.member.MemberRepository;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;



    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
            @RequestBody LoginRequest request
    ) {
        System.out.println("login request = " + request.getUserid());
        return ResponseEntity.ok(authService.login(request));
    }

}
