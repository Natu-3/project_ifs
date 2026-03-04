package com.example.backwork.rag;

import com.example.backwork.member.SessionUser;
import com.example.backwork.rag.dto.*;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final RagDocumentService ragDocumentService;
    private final SessionUserResolver sessionUserResolver;

    @PostMapping("/presign")
    public ResponseEntity<?> presign(
            @RequestBody DocumentPresignRequest request,
            HttpServletRequest httpRequest
    ) {
        SessionUser user = sessionUserResolver.resolve(httpRequest);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(ragDocumentService.presign(user.getId(), request));
    }

    @PostMapping("/{documentId}/complete")
    public ResponseEntity<?> complete(
            @PathVariable Long documentId,
            @RequestBody DocumentCompleteRequest request,
            HttpServletRequest httpRequest
    ) {
        SessionUser user = sessionUserResolver.resolve(httpRequest);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(ragDocumentService.complete(user.getId(), documentId, request));
    }

    @PostMapping("/{documentId}/index")
    public ResponseEntity<?> startIndex(
            @PathVariable Long documentId,
            HttpServletRequest httpRequest
    ) {
        SessionUser user = sessionUserResolver.resolve(httpRequest);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(ragDocumentService.startIndex(user.getId(), documentId));
    }

    @GetMapping("/{documentId}/status")
    public ResponseEntity<?> status(
            @PathVariable Long documentId,
            HttpServletRequest httpRequest
    ) {
        SessionUser user = sessionUserResolver.resolve(httpRequest);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(ragDocumentService.status(user.getId(), documentId));
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
