package com.example.backwork.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;


@Component
@RequiredArgsConstructor
@Order(1)
public class DatabaseInitializer {

    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void init() {
            ensureUserNameColumn();
            ensureMemoPriorityColumn();
            ensureMainNoteColumns();
        }


        private void ensureUserNameColumn() {

            try {
                if (!hasColumn("user", "name")) {
                    String alterTableSql = "ALTER TABLE `user` ADD COLUMN `name` VARCHAR(100) NULL AFTER `email`";
                    jdbcTemplate.execute(alterTableSql);
                    System.out.println("user 테이블에 name 컬럼이 추가되었습니다.");
                } else {
                    System.out.println("user 테이블에 name 컬럼이 이미 존재합니다.");
                }
            } catch (Exception e) {
                System.out.println("⚠️ name 컬럼 확인 중 오류 발생 (무시됨): " + e.getMessage());
            }
        }

            private void ensureMemoPriorityColumn() {
                try {
                    if (!hasColumn("memopost", "priority")) {
                        String alterTableSql = "ALTER TABLE `memopost` ADD COLUMN `priority` INT NOT NULL DEFAULT 2 AFTER `visible`";
                        jdbcTemplate.execute(alterTableSql);
                        System.out.println("✅ memopost 테이블에 priority 컬럼이 추가되었습니다.");
                    } else {
                        System.out.println("ℹ️ memopost 테이블에 priority 컬럼이 이미 존재합니다.");
                    }
                } catch (Exception e) {
                    System.out.println("⚠️ priority 컬럼 확인 중 오류 발생 (무시됨): " + e.getMessage());
                }
            }

            private void ensureMainNoteColumns() {
                try{
                    if(!hasColumn("memopost", "main_note_visible")){
                        String alterVisibleSql = "ALTER TABLE `memopost` ADD COLUMN `main_note_visible` TINYINT(1) NOT NULL DEFAULT 0 AFTER `priority`";
                        jdbcTemplate.execute(alterVisibleSql);
                        System.out.println("memopost 테이블에 main_mote_visible 컬럼이 추가되었습니다.");
                    }else{
                        System.out.println("memopost 테이블에 main_note_visible 컬럼이 이미 존재합니다.");
                    }

                    if (!hasColumn("memopost", "main_note_order")) {
                        String alterOrderSql = "ALTER TABLE `memopost` ADD COLUMN `main_note_order` INT NULL AFTER `main_note_visible`";
                        jdbcTemplate.execute(alterOrderSql);
                        System.out.println("memopost 테이블에 main_note_order 컬럼이 추가되었습니다.");
                    } else {
                        System.out.println("memopost 테이블에 main_note_order 컬럼이 이미 존재합니다.");
                    }
                } catch (Exception e) {
                    System.out.println("⚠️ main note 컬럼 확인 중 오류 발생 (무시됨): " + e.getMessage());
                }
            }


            private boolean hasColumn(String tableName, String columnName) {
                String checkColumnSql = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS " +
                        "WHERE TABLE_SCHEMA = DATABASE() " +
                        "AND TABLE_NAME = ? " +
                        "AND COLUMN_NAME = ?";

                Integer count = jdbcTemplate.queryForObject(
                        checkColumnSql,
                        Integer.class,
                        tableName,
                        columnName
                );

                return count != null && count > 0;
            }

    }








