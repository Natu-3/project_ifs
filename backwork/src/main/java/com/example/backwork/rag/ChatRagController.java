package com.example.backwork.rag;

import com.example.backwork.assistant.AssistantChatService;
import com.example.backwork.assistant.dto.AssistantChatRequest;
import com.example.backwork.assistant.dto.AssistantChatResponse;
import com.example.backwork.member.SessionUser;
import com.example.backwork.rag.dto.ChatQueryRequest;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
@Slf4j
public class ChatRagController {

    private final RagDocumentService ragDocumentService;
    private final SessionUserResolver sessionUserResolver;
    private final AssistantChatService assistantChatService;

    @PostMapping("/query")
    public ResponseEntity<?> query(
            @RequestBody ChatQueryRequest request,
            HttpServletRequest httpRequest
    ) {
        SessionUser user = sessionUserResolver.resolve(httpRequest);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(ragDocumentService.query(user.getId(), request));
    }

    @PostMapping("/assistant")
    public ResponseEntity<?> assistant(
            @RequestBody AssistantChatRequest request,
            HttpServletRequest httpRequest
    ) {
        SessionUser user = sessionUserResolver.resolve(httpRequest);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "code", "UNAUTHORIZED",
                    "message", "login required"
            ));
        }
        AssistantChatResponse response = assistantChatService.chat(user.getId(), request);
        return ResponseEntity.ok(response);
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

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalStateException(IllegalStateException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "code", "INVALID_STATE",
                "message", e.getMessage()
        ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleUnhandled(Exception e) {
        log.error("Unhandled exception in /api/chat", e);
        String detail = e.getMessage() == null ? e.getClass().getSimpleName() : (e.getClass().getSimpleName() + ": " + e.getMessage());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "code", "INTERNAL_ERROR",
                "message", detail
        ));
    }
}
