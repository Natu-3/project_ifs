-- =========================
-- 전체 리셋용 (MySQL)
-- =========================

SET FOREIGN_KEY_CHECKS = 0;

DROP SCHEMA IF EXISTS ifscm;
CREATE SCHEMA ifscm;

SET FOREIGN_KEY_CHECKS = 1;

USE ifscm;

-- =========================
-- USER
-- =========================
CREATE TABLE user (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    userid VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NULL,
    name VARCHAR(100) NULL,
    password VARCHAR(255) NOT NULL,
    auth VARCHAR(10) NOT NULL CHECK (auth IN ('USER', 'ADMIN')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- CALENDAR
-- =========================
CREATE TABLE calendar (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('PERSONAL', 'TEAM')),
    owner_id BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_calendar_owner
        FOREIGN KEY (owner_id) REFERENCES user(id)
        ON DELETE CASCADE
);

-- =========================
-- MEMOPOST
-- =========================
CREATE TABLE memopost (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    content TEXT NOT NULL,
    pinned BOOLEAN DEFAULT FALSE,
    visible BOOLEAN DEFAULT TRUE,
    priority INT NOT NULL DEFAULT 2,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_memo_user
        FOREIGN KEY (user_id) REFERENCES user(id)
        ON DELETE CASCADE
);

-- =========================
-- SCHEDULE
-- =========================
CREATE TABLE schedule (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    calendar_id BIGINT UNSIGNED NOT NULL,
    memo_id BIGINT UNSIGNED,
    title VARCHAR(200),
    content TEXT,
    start_datetime TIMESTAMP NOT NULL,
    end_datetime TIMESTAMP NOT NULL,
    priority INT DEFAULT 0,
    created_by BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT fk_schedule_calendar
        FOREIGN KEY (calendar_id) REFERENCES calendar(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_schedule_memo
        FOREIGN KEY (memo_id) REFERENCES memopost(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_schedule_creator
        FOREIGN KEY (created_by) REFERENCES user(id)
);

-- =========================
-- SHARE_ID
-- =========================
CREATE TABLE share_id (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    calendar_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    role_rw VARCHAR(10) NOT NULL CHECK (role_rw IN ('READ', 'WRITE')),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_share_calendar
        FOREIGN KEY (calendar_id) REFERENCES calendar(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_share_user
        FOREIGN KEY (user_id) REFERENCES user(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_calendar_user UNIQUE (calendar_id, user_id)
);

-- =========================
-- MEMO MAIN VIEW (메인화면 부착 순서)
-- =========================
CREATE TABLE memo_main_view (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    user_id BIGINT UNSIGNED NOT NULL,
    memo_id BIGINT UNSIGNED NOT NULL,

    order_index INT NOT NULL,
    attached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_main_view_user
        FOREIGN KEY (user_id) REFERENCES user(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_main_view_memo
        FOREIGN KEY (memo_id) REFERENCES memopost(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_user_memo UNIQUE (user_id, memo_id)
);

-- =========================
-- INIT DATA
-- =========================
INSERT INTO user (userid, email, password, auth)
VALUES
  ('user1', 'user@test.local', '$2a$10_dummyhash', 'USER'),
  ('admin1', 'admin@test.local', '$2a$10_dummyhash', 'ADMIN');

INSERT INTO calendar (name, type, owner_id)
VALUES
  ('개인 캘린더', 'PERSONAL', 1),
  ('개인 캘린더', 'PERSONAL', 2);



