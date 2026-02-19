package com.example.backwork.memo;

import com.example.backwork.member.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "memopost")
@Getter
@Setter
@NoArgsConstructor
public class MemoPost {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;
    
    @Column(nullable = false)
    private Boolean pinned = false;
    
    @Column(nullable = false)
    private Boolean visible = true;
    
    @Column(nullable = false)
    private Integer priority = 2; // 0: 긴급, 1: 높음, 2: 보통, 3: 낮음, 4: 없음

    @Column(name = "main_note_visible", nullable = false)
    private Boolean mainNoteVisible = false;

    @Column(name = "main_note_order")
    private Integer mainNoteOrder;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}