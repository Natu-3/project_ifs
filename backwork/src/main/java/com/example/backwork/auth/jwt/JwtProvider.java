package com.example.backwork.auth.jwt;

import com.example.backwork.member.User;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.util.Date;
@Service
public class JwtProvider {

    private static final String SECRET_KEY =
            "ifs-project-jwt-secret-key-ifs-project-jwt-secret-key";

    private static final long ACCESS_TOKEN_EXP = 1000 * 60 * 30; // 30분
    private static final long DEV_TOKEN_EXP = 1000 * 60 * 60;   // 1시간

    private static final Key key = Keys.hmacShaKeyFor(SECRET_KEY.getBytes());




    //임시토큰용 나중에 삭제
    public static String generateToken(Long userId, String userid, String auth) {
        return Jwts.builder()
                .setSubject(userid)
                .claim("userId", userId)
                .claim("auth", auth)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + DEV_TOKEN_EXP))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    //실질적 쿠키용 토큰
    public String createAccessToken(User user) {
        return Jwts.builder()
                .setSubject(user.getUserid())
                .claim("uid", user.getId())
                .claim("role", user.getAuth())
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + ACCESS_TOKEN_EXP))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public static Claims parseToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}