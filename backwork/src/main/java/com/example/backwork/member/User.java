package com.example.backwork.member;

import jakarta.persistence.*;
import lombok.Getter;

import java.time.LocalDateTime;



// 멤버테이블 값들 변수형 선언하는 인터페이스
@Entity
@Table(name = "user")
@Getter
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String userid;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password", nullable = false)
    private String password;

    @Column(nullable = false)
    private String auth; // USER / ADMIN

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
