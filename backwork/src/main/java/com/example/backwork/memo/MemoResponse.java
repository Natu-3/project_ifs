package com.example.backwork.memo;

import lombok.AllArgsConstructor;
import lombok.Getter;
import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class MemoResponse {
    private Long id;
    private String content;
    private String title;  // content의 앞 10자
    private Boolean pinned;
    private Boolean visible;
    private Integer priority;
    private Boolean mainNoteVisible;
    private Integer mainNoteOrder;
    private LocalDateTime createdAt;
    
    public static MemoResponse from(MemoPost memo) {
        String title = memo.getContent().length() > 10 
            ? memo.getContent().substring(0, 10) 
            : memo.getContent();
            
        return new MemoResponse(
            memo.getId(),
            memo.getContent(),
            title,
            memo.getPinned(),
            memo.getVisible(),
            memo.getPriority(),
            memo.getMainNoteVisible(),
            memo.getMainNoteOrder(),
            memo.getCreatedAt()
        );
    }
}