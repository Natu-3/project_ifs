package com.example.backwork.member;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.jspecify.annotations.Nullable;

import java.time.LocalDateTime;



// 멤버테이블 값들 변수형 선언하는 인터페이스
@Entity
@Table(name = "user")
@Getter
@Setter
public class User {
    protected User() {
        // JPA용 기본 생성자
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String userid;

    @Column(nullable = true, unique = false)
    private String email;

    @Column(nullable = true)
    private String name;

    @Column(name = "password", nullable = false)
    private String password;

    @Column(nullable = false)
    private String auth; // USER / ADMIN

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public User(String userid, @Nullable String encode) {
        this.userid = userid;
        this.password = encode;
        this.auth = "USER";
        this.email = null;
        this.name = null;
    }

    public User(String userid, @Nullable String encode, @Nullable String email, @Nullable String name) {
        this.userid = userid;
        this.password = encode;
        this.auth = "USER";
        this.email = email;
        this.name = name;
    }
}
