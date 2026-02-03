package com.example.backwork.auth.jwt;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;

import java.security.Key;
import java.util.Date;

public class JwtProvider {

    private static final String SECRET_KEY =
            "ifs-project-jwt-secret-key-ifs-project-jwt-secret-key";

    private static final long EXPIRATION_TIME = 1000 * 60 * 60; // 1시간

    private static final Key key = Keys.hmacShaKeyFor(SECRET_KEY.getBytes());

    public static String generateToken(Long userId, String userid, String auth) {
        return Jwts.builder()
                .setSubject(userid)
                .claim("userId", userId)
                .claim("auth", auth)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
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