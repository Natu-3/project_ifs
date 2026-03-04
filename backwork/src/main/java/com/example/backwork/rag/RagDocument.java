package com.example.backwork.rag;

import com.example.backwork.calendar.Calendar;
import com.example.backwork.member.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "documents")
@Getter
@NoArgsConstructor
public class RagDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_user_id", nullable = false)
    private User owner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "calendar_id", nullable = false)
    private Calendar calendar;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "s3_bucket", nullable = false, length = 255)
    private String s3Bucket;

    @Column(name = "s3_key", nullable = false, length = 1024)
    private String s3Key;

    @Column(name = "mime_type", nullable = false, length = 100)
    private String mimeType;

    @Column(name = "file_size")
    private Long fileSize;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    private DocumentStatus status;

    @Column(name = "visibility", nullable = false, length = 50)
    private String visibility;

    @Column(name = "tags_csv", length = 1000)
    private String tagsCsv;

    @Column(name = "vector_bucket", length = 255)
    private String vectorBucket;

    @Column(name = "vector_index", length = 255)
    private String vectorIndex;

    @Column(name = "embedding_model", length = 100)
    private String embeddingModel;

    @Column(name = "chunk_count")
    private Integer chunkCount;

    @Column(name = "version", nullable = false)
    private Integer version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public RagDocument(
            User owner,
            Calendar calendar,
            String title,
            String s3Bucket,
            String s3Key,
            String mimeType,
            Long fileSize,
            String visibility,
            String vectorBucket,
            String vectorIndex,
            String embeddingModel
    ) {
        this.owner = owner;
        this.calendar = calendar;
        this.title = title;
        this.s3Bucket = s3Bucket;
        this.s3Key = s3Key;
        this.mimeType = mimeType;
        this.fileSize = fileSize;
        this.status = DocumentStatus.UPLOADED;
        this.visibility = visibility;
        this.vectorBucket = vectorBucket;
        this.vectorIndex = vectorIndex;
        this.embeddingModel = embeddingModel;
        this.chunkCount = 0;
        this.version = 1;
    }

    public void complete(String title, String tagsCsv) {
        if (title != null && !title.isBlank()) {
            this.title = title;
        }
        this.tagsCsv = tagsCsv;
        this.status = DocumentStatus.UPLOADED;
        this.updatedAt = LocalDateTime.now();
    }

    public void markIndexing() {
        this.status = DocumentStatus.INDEXING;
        this.updatedAt = LocalDateTime.now();
    }

    public void markReady(int chunkCount) {
        this.status = DocumentStatus.READY;
        this.chunkCount = chunkCount;
        this.updatedAt = LocalDateTime.now();
    }

    public void markFailed() {
        this.status = DocumentStatus.FAILED;
        this.updatedAt = LocalDateTime.now();
    }

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }
}
