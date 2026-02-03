package com.example.backwork.config;

import com.example.backwork.auth.jwt.JwtAuthFilter;
import com.example.backwork.auth.jwt.JwtProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtProvider jwtProvider) throws Exception {
    http
        .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                    //접근 허용한 URL들
                            .requestMatchers(
                                    "/api/auth/**",
                                    "/api/memos/**",
                                        "/").permitAll()
        .anyRequest().authenticated()
        )
//            .httpBasic(httpBasic -> httpBasic.disable())
//            .formLogin(form -> form.disable());

            .addFilterBefore(
              new JwtAuthFilter(jwtProvider),
              UsernamePasswordAuthenticationFilter.class
            );





    return http.build();
    }



    /**
     * @Bean
     * 이 메서드가 반환하는 객체를 스프링 컨테이너에 Bean으로 등록합니다.
     * Bean으로 등록되면, 다른 클래스에서 @Autowired 또는 생성자 주입으로 쉽게 사용할 수 있습니다.
     *
     * passwordEncoder()
     * Spring Security에서 사용자 비밀번호를 암호화할 때 사용되는 BCryptPasswordEncoder 객체를 생성하여 반환합니다.
     * BCryptPasswordEncoder는 단방향 해시 함수를 사용하여 비밀번호를 안전하게 암호화하며,
     * 동일한 비밀번호라도 매번 다른 해시 값을 생성하여 보안을 강화합니다.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
