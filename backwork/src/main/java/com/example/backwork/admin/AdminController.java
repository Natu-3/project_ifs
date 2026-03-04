package com.example.backwork.admin;

import com.example.backwork.admin.dto.AdminDashboardTodayResponse;
import com.example.backwork.admin.dto.AdminUserItemResponse;
import com.example.backwork.admin.dto.AdminUserListResponse;
import com.example.backwork.admin.dto.AdminUserRoleUpdateRequest;
import com.example.backwork.member.SessionUser;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminDashboardService adminDashboardService;

    @GetMapping("/dashboard/today")
    public ResponseEntity<?> getTodayDashboard(HttpServletRequest request) {
        SessionUser user = requireAdmin(request);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        AdminDashboardTodayResponse response = adminDashboardService.getTodayDashboard();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/users")
    public ResponseEntity<?> getUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String keyword,
            HttpServletRequest request
    ) {
        SessionUser user = requireAdmin(request);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        AdminUserListResponse response = adminDashboardService.getUsers(page, size, keyword);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/users/{userId}/role")
    public ResponseEntity<?> updateRole(
            @PathVariable Long userId,
            @RequestBody AdminUserRoleUpdateRequest requestBody,
            HttpServletRequest request
    ) {
        SessionUser user = requireAdmin(request);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        AdminUserItemResponse response = adminDashboardService.updateUserRole(user.getId(), userId, requestBody.auth());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/users/{userId}/reset-password-required")
    public ResponseEntity<?> markResetPasswordRequired(
            @PathVariable Long userId,
            HttpServletRequest request
    ) {
        SessionUser user = requireAdmin(request);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        AdminUserItemResponse response = adminDashboardService.markResetPasswordRequired(user.getId(), userId);
        return ResponseEntity.ok(response);
    }

    private SessionUser requireAdmin(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) return null;
        SessionUser sessionUser = (SessionUser) session.getAttribute("LOGIN_USER");
        if (sessionUser == null) return null;
        if (!"ADMIN".equalsIgnoreCase(sessionUser.getAuth())) {
            throw new SecurityException("관리자 권한이 필요합니다.");
        }
        return sessionUser;
    }

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<Map<String, Object>> handleSecurityException(SecurityException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "code", "FORBIDDEN",
                "message", e.getMessage()
        ));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalStateException(IllegalStateException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "code", "CONFLICT",
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

