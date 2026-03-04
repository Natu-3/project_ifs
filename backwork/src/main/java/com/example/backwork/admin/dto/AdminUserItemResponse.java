package com.example.backwork.admin.dto;

import java.time.LocalDateTime;

public record AdminUserItemResponse(
        Long id,
        String userid,
        String name,
        String email,
        String auth,
        LocalDateTime createdAt,
        boolean mustChangePassword
) {
}

