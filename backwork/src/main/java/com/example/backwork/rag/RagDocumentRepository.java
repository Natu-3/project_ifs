package com.example.backwork.rag;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RagDocumentRepository extends JpaRepository<RagDocument, Long> {
    Optional<RagDocument> findByIdAndOwnerId(Long id, Long ownerId);
    List<RagDocument> findByCalendarIdAndOwnerId(Long calendarId, Long ownerId);
    List<RagDocument> findByCalendarIdInAndStatus(List<Long> calendarIds, DocumentStatus status);
}
