package com.example.backwork.memo;

import com.example.backwork.member.User;
import com.example.backwork.member.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class MemoService {
    
    private final MemoPostRepository memoPostRepository;
    private final UserRepository userRepository;
    
    // 메모 목록 조회
    public List<MemoResponse> getMemos(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다"));
            
        return memoPostRepository
            .findByUserAndVisibleTrueOrderByCreatedAtDesc(user)
            .stream()
            .map(MemoResponse::from)
            .collect(Collectors.toList());
    }

     private Integer resolveMainNoteOrder(Integer value) {
        if (value == null) {
            return null;
        }
        return Math.max(value, 0);
    }
    
    // 메모 생성
    public MemoResponse createMemo(Long userId, MemoRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다"));
            
        MemoPost memo = new MemoPost();
        memo.setUser(user);
        memo.setContent(request.getContent());
        memo.setPinned(request.getPinned() != null ? request.getPinned() : false);
        memo.setVisible(request.getVisible() != null ? request.getVisible() : true);
        memo.setPriority(request.getPriority() != null ? request.getPriority() : 2);
        memo.setMainNoteVisible(request.getMainNoteVisible() != null ? request.getMainNoteVisible() : false);
        memo.setMainNoteOrder(resolveMainNoteOrder(request.getMainNoteOrder()));
        
        MemoPost saved = memoPostRepository.save(memo);
        return MemoResponse.from(saved);
    }
    
    // 메모 수정
    public MemoResponse updateMemo(Long memoId, Long userId, MemoRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다"));
            
        MemoPost memo = memoPostRepository.findByIdAndUser(memoId, user)
            .orElseThrow(() -> new IllegalArgumentException("메모를 찾을 수 없습니다"));
            
        if (request.getContent() != null) {
            memo.setContent(request.getContent());
        }
        if (request.getPinned() != null) {
            memo.setPinned(request.getPinned());
        }
        if (request.getVisible() != null) {
            memo.setVisible(request.getVisible());
        }
        if (request.getPriority() != null) {
            memo.setPriority(request.getPriority());
        }
        if (request.getMainNoteVisible() != null) {
            memo.setMainNoteVisible(request.getMainNoteVisible());
        }
        if (request.getMainNoteOrder() != null) {
            memo.setMainNoteOrder(resolveMainNoteOrder(request.getMainNoteOrder()));
        }
        
        return MemoResponse.from(memo);
    }

     public List<MemoResponse> updateMainNoteOrder(Long userId, List<MemoRequest> requests) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다"));

        for (MemoRequest request : requests) {
            if (request == null || request.getId() == null) {
                continue;
            }

            MemoPost memo = memoPostRepository.findByIdAndUser(request.getId(), user)
                    .orElseThrow(() -> new IllegalArgumentException("메모를 찾을 수 없습니다"));

            if (request.getMainNoteVisible() != null) {
                memo.setMainNoteVisible(request.getMainNoteVisible());
            }
            memo.setMainNoteOrder(resolveMainNoteOrder(request.getMainNoteOrder()));
        }

        return memoPostRepository
                .findByUserAndVisibleTrueOrderByCreatedAtDesc(user)
                .stream()
                .map(MemoResponse::from)
                .collect(Collectors.toList());
    }
    
    // 메모 삭제 (soft delete - visible을 false로)
    public void deleteMemo(Long memoId, Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다"));
            
        MemoPost memo = memoPostRepository.findByIdAndUser(memoId, user)
            .orElseThrow(() -> new IllegalArgumentException("메모를 찾을 수 없습니다"));
            
        memo.setVisible(false);
        memoPostRepository.save(memo);
    }
}