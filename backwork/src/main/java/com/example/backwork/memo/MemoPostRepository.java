package com.example.backwork.memo;

import com.example.backwork.member.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface MemoPostRepository extends JpaRepository<MemoPost, Long> {
    
    // 특정 사용자의 모든 메모 조회 (visible=true만)
    List<MemoPost> findByUserAndVisibleTrueOrderByCreatedAtDesc(User user);
    
    // 특정 사용자의 메모 조회 (ID로)
    Optional<MemoPost> findByIdAndUser(Long id, User user);
    
    // 특정 사용자의 고정된 메모 조회
    List<MemoPost> findByUserAndPinnedTrueAndVisibleTrueOrderByCreatedAtDesc(User user);
}