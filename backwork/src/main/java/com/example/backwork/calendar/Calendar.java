package com.example.backwork.calendar;

import com.example.backwork.member.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
/*
캘린더 정의
id
name
type - personal / team
owner fk( user id )
created_at


 */
@Entity
@Table(name = "calendar")
@Getter
@NoArgsConstructor
public class Calendar {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String type; // PERSONAL / TEAM

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id")
    private User owner;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public Calendar(String name, String type, User owner) {
        this.name = name;
        this.type = type;
        this.owner = owner;
    }
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
