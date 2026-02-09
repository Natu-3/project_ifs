package com.example.backwork.schedule.entity;

import com.example.backwork.calendar.Calendar;
import com.example.backwork.member.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor
@Table(name = "schedule")
public class Schedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 개인 캘린더 (1:1 개념)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "calendar_id", nullable = false)
    private Calendar calendar;

    // 일정 주인 = 로그인 유저
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User owner;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String content;

    private LocalDateTime startAt;
    private LocalDateTime endAt;

    public Schedule(
            Calendar calendar,
            User owner,
            String title,
            String content,
            LocalDateTime startAt,
            LocalDateTime endAt
    ) {
        this.calendar = calendar;
        this.owner = owner;
        this.title = title;
        this.content = content;
        this.startAt = startAt;
        this.endAt = endAt;
    }

    public void update(
            String title,
            String content,
            LocalDateTime startAt,
            LocalDateTime endAt
    ) {
        this.title = title;
        this.content = content;
        this.startAt = startAt;
        this.endAt = endAt;
    }
}
