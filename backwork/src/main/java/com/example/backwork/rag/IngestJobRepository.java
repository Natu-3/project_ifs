package com.example.backwork.rag;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface IngestJobRepository extends JpaRepository<IngestJob, Long> {
    Optional<IngestJob> findTopByDocumentIdOrderByCreatedAtDesc(Long documentId);
}
