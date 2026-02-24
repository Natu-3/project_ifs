package com.example.backwork.memo;

import com.example.backwork.member.User;
import com.example.backwork.member.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
        
        return MemoResponse.from(memo);
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
    public void updateMainNoteOrder(Long userId, List<MemoMainNoteOrderUpdateRequest> requests) {
        if (requests == null || requests.isEmpty()) {
            return;
        }

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("?ъ슜?먮? 李얠쓣 ???놁뒿?덈떎"));

        List<Long> ids = requests.stream()
            .map(MemoMainNoteOrderUpdateRequest::getId)
            .collect(Collectors.toList());

        if (ids.stream().anyMatch(id -> id == null)) {
            throw new IllegalArgumentException("memo id is required");
        }

        List<MemoPost> memos = memoPostRepository.findByUserAndIdIn(user, ids);
        if (memos.size() != ids.size()) {
            throw new IllegalArgumentException("some memos not found for user");
        }

        Map<Long, MemoPost> memoById = new HashMap<>();
        for (MemoPost memo : memos) {
            memoById.put(memo.getId(), memo);
        }

        for (MemoMainNoteOrderUpdateRequest request : requests) {
            MemoPost memo = memoById.get(request.getId());
            if (memo == null) {
                continue;
            }

            if (request.getMainNoteVisible() != null) {
                memo.setMainNoteVisible(request.getMainNoteVisible());
            }
            memo.setMainNoteOrder(request.getMainNoteOrder());
        }

        memoPostRepository.saveAll(memos);
    }
}
