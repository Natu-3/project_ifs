CREATE SCHEMA ifscm;

CREATE TABLE member (
    id SERIAL PRIMARY KEY,
    userid VARCHAR(50) UNIQUE NOT NULL,   -- 로그인 ID
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    auth VARCHAR(10) NOT NULL CHECK (auth IN ('USER', 'ADMIN')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE calendar (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('PERSONAL', 'TEAM')),
    owner_id BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_calendar_owner
        FOREIGN KEY (owner_id) REFERENCES member(id)
        ON DELETE CASCADE
);


CREATE TABLE memopost (
    id SERIAL PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    content TEXT NOT NULL,
    pinned BOOLEAN DEFAULT FALSE,
    visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_memo_user
        FOREIGN KEY (user_id) REFERENCES member(id)
        ON DELETE CASCADE
);

CREATE TABLE schedule (
    id SERIAL PRIMARY KEY,
    calendar_id BIGINT UNSIGNED NOT NULL,
    memo_id BIGINT UNSIGNED,   -- 메모 없이 생성된 일정 허용
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
        FOREIGN KEY (created_by) REFERENCES member(id)
);

CREATE TABLE share_id (
    id SERIAL PRIMARY KEY,
    calendar_id BIGINT unsigned NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    role_rw VARCHAR(10) NOT NULL CHECK (role_rw IN ('READ', 'WRITE')),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_share_calendar
        FOREIGN KEY (calendar_id) REFERENCES calendar(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_share_user
        FOREIGN KEY (user_id) REFERENCES member(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_calendar_user UNIQUE (calendar_id, user_id)
);

INSERT INTO member (userid, email, password_hash, auth)
VALUES
  ('user1', 'user@test.local', '$2a$10_dummyhash', 'USER'),
  ('admin1', 'admin@test.local', '$2a$10_dummyhash', 'ADMIN');

INSERT INTO calendar (name, type, owner_id)
VALUES
  ('개인 캘린더', 'PERSONAL', 1),
  ('개인 캘린더', 'PERSONAL', 2);

