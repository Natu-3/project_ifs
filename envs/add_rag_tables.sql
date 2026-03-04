CREATE TABLE IF NOT EXISTS documents (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    owner_user_id BIGINT UNSIGNED NOT NULL,
    calendar_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    s3_bucket VARCHAR(255) NOT NULL,
    s3_key VARCHAR(1024) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NULL,
    status VARCHAR(50) NOT NULL,
    visibility VARCHAR(50) NOT NULL,
    tags_csv VARCHAR(1000) NULL,
    vector_bucket VARCHAR(255) NULL,
    vector_index VARCHAR(255) NULL,
    embedding_model VARCHAR(100) NULL,
    chunk_count INT NULL,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_documents_owner FOREIGN KEY (owner_user_id) REFERENCES user(id),
    CONSTRAINT fk_documents_calendar FOREIGN KEY (calendar_id) REFERENCES calendar(id)
);

CREATE TABLE IF NOT EXISTS ingest_jobs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    document_id BIGINT UNSIGNED NOT NULL,
    job_status VARCHAR(50) NOT NULL,
    error_message TEXT NULL,
    started_at TIMESTAMP NULL,
    finished_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ingest_jobs_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);
