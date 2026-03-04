package com.example.backwork.admin.dto;

import java.util.List;

public record AdminUserListResponse(
        List<AdminUserItemResponse> items,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
}

