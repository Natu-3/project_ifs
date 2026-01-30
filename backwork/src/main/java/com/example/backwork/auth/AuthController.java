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
    public ResponseEntity<?> login(/*@RequestBody LoginRequest request*/) {
        System.out.println("🔥 CONTROLLER HIT");
        return ResponseEntity.ok("OK");
    }

}
