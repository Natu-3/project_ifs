package com.example.backwork.memo;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/memos")
@RequiredArgsConstructor
public class MemoController {
    
    private final MemoService memoService;
    
    // TODO: 실제로는 세션/토큰에서 userId 가져와야 함
    // 임시로 @RequestParam 사용
    @GetMapping
    public ResponseEntity<List<MemoResponse>> getMemos(
        @RequestParam Long userId
    ) {
        return ResponseEntity.ok(memoService.getMemos(userId));
    }
    
    @PostMapping
    public ResponseEntity<MemoResponse> createMemo(
        @RequestParam Long userId,
        @RequestBody MemoRequest request
    ) {
        return ResponseEntity.ok(memoService.createMemo(userId, request));
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<MemoResponse> updateMemo(
        @PathVariable Long id,
        @RequestParam Long userId,
        @RequestBody MemoRequest request
    ) {
        return ResponseEntity.ok(memoService.updateMemo(id, userId, request));
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMemo(
        @PathVariable Long id,
        @RequestParam Long userId
    ) {
        memoService.deleteMemo(id, userId);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/main-note-order")
    public ResponseEntity<Void> updateMainNoteOrder(
        @RequestParam Long userId,
        @RequestBody List<MemoMainNoteOrderUpdateRequest> requests
    ) {
        memoService.updateMainNoteOrder(userId, requests);
        return ResponseEntity.ok().build();
    }
}
