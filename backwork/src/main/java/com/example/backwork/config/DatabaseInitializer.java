package com.example.backwork.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Order(1)
public class DatabaseInitializer {

    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void init() {
        try {
            // user 테이블에 name 컬럼이 있는지 확인
            String checkColumnSql = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS " +
                    "WHERE TABLE_SCHEMA = DATABASE() " +
                    "AND TABLE_NAME = 'user' " +
                    "AND COLUMN_NAME = 'name'";
            
            Integer count = jdbcTemplate.queryForObject(checkColumnSql, Integer.class);
            
            if (count == null || count == 0) {
                // name 컬럼이 없으면 추가
                String alterTableSql = "ALTER TABLE `user` ADD COLUMN `name` VARCHAR(100) NULL AFTER `email`";
                jdbcTemplate.execute(alterTableSql);
                System.out.println("✅ user 테이블에 name 컬럼이 추가되었습니다.");
            } else {
                System.out.println("ℹ️ user 테이블에 name 컬럼이 이미 존재합니다.");
            }
        } catch (Exception e) {
            // 컬럼이 이미 존재하거나 다른 오류가 발생해도 계속 진행
            System.out.println("⚠️ name 컬럼 확인 중 오류 발생 (무시됨): " + e.getMessage());
        }
    }
}

