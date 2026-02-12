package com.example.backwork.calendar.share;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "share_id",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_share_calendar_user", columnNames = {"calendar_id", "user_id"})
        }
)
@IdClass(ShareMemberId.class)
@Getter
@NoArgsConstructor
public class ShareMember {

    @Id
    @Column(name = "calendar_id", nullable = false)
    private Long calendarId;

    @Id
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "role_rw", nullable = false, length = 10)
    private RoleRw roleRw;

    @Column(name = "joined_at", nullable = false, updatable = false)
    private LocalDateTime joinedAt;

    public ShareMember(Long calendarId, Long userId, RoleRw roleRw) {
        this.calendarId = calendarId;
        this.userId = userId;
        this.roleRw = roleRw;
    }

    public void updateRole(RoleRw roleRw) {
        this.roleRw = roleRw;
    }

    @PrePersist
    protected void onCreate() {
        joinedAt = LocalDateTime.now();
    }
}