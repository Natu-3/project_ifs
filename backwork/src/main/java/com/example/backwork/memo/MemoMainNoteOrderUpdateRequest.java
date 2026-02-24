package com.example.backwork.memo;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class MemoMainNoteOrderUpdateRequest {
    private Long id;
    private Boolean mainNoteVisible;
    private Integer mainNoteOrder;
}
