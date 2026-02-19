package com.example.backwork.memo;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class MemoRequest {
    private Long id;
    private String content;
    private Boolean pinned;
    private Boolean visible;
    private Integer priority;
    private Boolean mainNoteVisible;
    private Integer mainNoteOrder;
}