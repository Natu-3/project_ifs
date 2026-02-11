// package com.example.backwork.auth.jwt;

// import com.example.backwork.member.User;
// import io.jsonwebtoken.*;
// import io.jsonwebtoken.security.Keys;
// import jakarta.servlet.http.Cookie;
// import jakarta.servlet.http.HttpServletRequest;
// import org.springframework.stereotype.Service;

// import java.security.Key;
// import java.util.Date;
// @Service
// public class JwtProvider {
// /* 토큰 제공용 객체
//     현재 로컬에서 바로 확인가능한 generateToken - 실제 빌드때는 삭제예정,
//     실질적 서비스용 쿠키에 발급되는 토큰 createAccessToken
//  */
//     private static final String SECRET_KEY =
//             "ifs-project-jwt-secret-key-ifs-project-jwt-secret-key";

//     private static final long ACCESS_TOKEN_EXP = 1000 * 60 * 30; // 30분
//     private static final long DEV_TOKEN_EXP = 1000 * 60 * 60;   // 1시간

//     private static final Key key = Keys.hmacShaKeyFor(SECRET_KEY.getBytes());




//     //임시토큰용 나중에 삭제
//     public static String generateToken(Long userId, String userid, String auth) {
//         return Jwts.builder()
//                 .setSubject(userid)
//                 .claim("userId", userId)
//                 .claim("auth", auth)
//                 .setIssuedAt(new Date())
//                 .setExpiration(new Date(System.currentTimeMillis() + DEV_TOKEN_EXP))
//                 .signWith(key, SignatureAlgorithm.HS256)
//                 .compact();
//     }

//     //실질적 쿠키용 토큰
//     public String createAccessToken(User user) {
//         return Jwts.builder()
//                 .setSubject(user.getUserid())
//                 .claim("uid", user.getId())
//                 .claim("role", user.getAuth())
//                 .setIssuedAt(new Date())
//                 .setExpiration(new Date(System.currentTimeMillis() + ACCESS_TOKEN_EXP))
//                 .signWith(key, SignatureAlgorithm.HS256)
//                 .compact();
//     }

//     public static Claims parseToken(String token) {
//         return Jwts.parserBuilder()
//                 .setSigningKey(key)
//                 .build()
//                 .parseClaimsJws(token)
//                 .getBody();
//     }
//     // 받은 스트링키 처리
//     public String resolveTokenFromCookie(HttpServletRequest request) {

//         if (request.getCookies() == null) return null;

//         for (Cookie cookie : request.getCookies()) {
//             if ("accessToken".equals(cookie.getName())) {
//                 return cookie.getValue();
//             }
//         }
//         return null;
//     }

//     public boolean validateToken(String token) {
//         try {
//             Jwts.parserBuilder()
//                     .setSigningKey(key)
//                     .build()
//                     .parseClaimsJws(token);
//             return true;
//         } catch (ExpiredJwtException e) {
//             // 토큰 만료
//             return false;
//         } catch (JwtException | IllegalArgumentException e) {
//             // 위조, 변조, 형식 오류
//             return false;
//         }
//     }



// }