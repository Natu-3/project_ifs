package com.example.backwork.rag;

import com.example.backwork.member.SessionUser;
import com.example.backwork.rag.dto.ChatQueryRequest;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatRagController {

    private final RagDocumentService ragDocumentService;
    private final SessionUserResolver sessionUserResolver;

    @PostMapping("/query")
    public ResponseEntity<?> query(
            @RequestBody ChatQueryRequest request,
            HttpServletRequest httpRequest
    ) {
        SessionUser user = sessionUserResolver.resolve(httpRequest);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(ragDocumentService.query(user.getId(), request));
    }

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<Map<String, Object>> handleSecurityException(SecurityException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "code", "FORBIDDEN",
                "message", e.getMessage()
        ));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgumentException(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(Map.of(
                "code", "BAD_REQUEST",
                "message", e.getMessage()
        ));
    }
}
