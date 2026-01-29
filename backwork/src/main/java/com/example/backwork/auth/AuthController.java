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

    private MemberRepository memberRepository;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {

        Member member = memberRepository.findByUserid(request.getUserid())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자"));

        //  지금은 더미 비밀번호 1234
        if (!member.getPasswordHash().equals(request.getPassword())) {
            return ResponseEntity.badRequest().body("비밀번호 불일치");
        }

        return ResponseEntity.ok(
                new LoginResponse(
                        member.getId(),
                        member.getUserid(),
                        member.getAuth()
                )
        );
    }
}
