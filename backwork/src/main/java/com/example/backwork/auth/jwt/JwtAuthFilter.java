package com.example.backwork.auth.jwt;
//JWT 권한용 필터

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwt;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.repository.query.PreprocessedQuery;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;
import com.example.backwork.auth.jwt.JwtProvider;
import java.io.IOException;
import java.util.List;

@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {
    private final JwtProvider jwtProvider;


    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String token = extarctTokenFromCookie(request);

        if (token != null){
            try {
                Claims claims = JwtProvider.parseToken(token);

                Long userId = claims.get("userId", Long.class);
                String userid = claims.getSubject();
                String auth = claims.get("auth", String.class);

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                userid,
                                null,
                                List.of(new SimpleGrantedAuthority("ROLE_" + auth))
                        );
                authentication.setDetails(
                        new WebAuthenticationDetailsSource().buildDetails(request)
                );
                SecurityContextHolder.getContext().setAuthentication(authentication);
            } catch (Exception e){
                SecurityContextHolder.clearContext();
            }
        }
        filterChain.doFilter(request, response);

    }
    private String extarctTokenFromCookie(HttpServletRequest request){
        if (request.getCookies() == null) return null;

    for (Cookie cookie : request.getCookies()){
        if("accessToken".equals((cookie.getName()))) {
            return cookie.getValue();
        }
    }
    return null;

}
}