package com.example.backwork.rag;

import com.example.backwork.calendar.Calendar;
import com.example.backwork.member.User;
import com.example.backwork.member.UserRepository;
import com.example.backwork.rag.dto.*;
import com.example.backwork.rag.internal.PythonIngestRequest;
import com.example.backwork.rag.internal.PythonIngestResponse;
import com.example.backwork.rag.internal.PythonQueryRequest;
import com.example.backwork.rag.internal.PythonQueryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class RagDocumentService {

    private final RagDocumentRepository ragDocumentRepository;
    private final IngestJobRepository ingestJobRepository;
    private final UserRepository userRepository;
    private final RagAccessService ragAccessService;
    private final PythonRagClient pythonRagClient;
    private final S3PresignService s3PresignService;

    @Value("${rag.raw-bucket:mock-documents-dev}")
    private String rawBucket;

    @Value("${rag.vector-bucket:mock-rag-dev}")
    private String vectorBucket;

    @Value("${rag.vector-index:knowledge-base}")
    private String vectorIndex;

    @Value("${rag.embedding-model:text-embedding-3-small}")
    private String embeddingModel;

    public DocumentPresignResponse presign(Long userId, DocumentPresignRequest request) {
        if (request.fileName() == null || request.fileName().isBlank()) {
            throw new IllegalArgumentException("fileName은 필수입니다.");
        }
        if (request.contentType() == null || request.contentType().isBlank()) {
            throw new IllegalArgumentException("contentType은 필수입니다.");
        }
        if (request.calendarId() == null) {
            throw new IllegalArgumentException("calendarId는 필수입니다.");
        }

        Calendar calendar = ragAccessService.requireWritable(request.calendarId(), userId);
        User owner = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        String s3Key = "user-%d/calendar-%d/%d/%s".formatted(
                userId,
                request.calendarId(),
                Instant.now().toEpochMilli(),
                sanitizeFileName(request.fileName())
        );

        RagDocument document = new RagDocument(
                owner,
                calendar,
                request.fileName(),
                rawBucket,
                s3Key,
                request.contentType(),
                null,
                "private",
                vectorBucket,
                vectorIndex,
                embeddingModel
        );
        ragDocumentRepository.save(document);

        String uploadUrl = s3PresignService.presignPutUrl(rawBucket, s3Key, request.contentType());
        return new DocumentPresignResponse(document.getId(), uploadUrl, s3Key);
    }

    public DocumentCompleteResponse complete(Long userId, Long documentId, DocumentCompleteRequest request) {
        RagDocument document = getOwnedDocument(userId, documentId);
        ragAccessService.requireWritable(document.getCalendar().getId(), userId);

        String tagsCsv = request.tags() == null
                ? null
                : request.tags().stream().filter(tag -> tag != null && !tag.isBlank()).collect(Collectors.joining(","));
        document.complete(request.title(), tagsCsv);
        ragDocumentRepository.save(document);
        return new DocumentCompleteResponse(document.getId(), document.getStatus());
    }

    public DocumentIndexResponse startIndex(Long userId, Long documentId) {
        RagDocument document = getOwnedDocument(userId, documentId);
        ragAccessService.requireWritable(document.getCalendar().getId(), userId);

        IngestJob job = new IngestJob(document);
        ingestJobRepository.save(job);
        document.markIndexing();
        ragDocumentRepository.save(document);
        job.markRunning();
        ingestJobRepository.save(job);

        try {
            List<String> tags = splitTags(document.getTagsCsv());
            PythonIngestResponse ingestResponse = pythonRagClient.ingest(new PythonIngestRequest(
                    document.getId(),
                    userId,
                    document.getCalendar().getId(),
                    document.getS3Bucket(),
                    document.getS3Key(),
                    document.getVectorBucket(),
                    document.getVectorIndex(),
                    document.getEmbeddingModel(),
                    tags
            ));

            int chunkCount = ingestResponse != null && ingestResponse.chunkCount() != null
                    ? ingestResponse.chunkCount()
                    : 0;
            document.markReady(chunkCount);
            job.markSuccess();
        } catch (Exception e) {
            document.markFailed();
            job.markFailed(e.getMessage());
        }

        ragDocumentRepository.save(document);
        ingestJobRepository.save(job);
        return new DocumentIndexResponse(job.getId(), job.getJobStatus());
    }

    @Transactional(readOnly = true)
    public DocumentStatusResponse status(Long userId, Long documentId) {
        RagDocument document = getOwnedDocument(userId, documentId);
        ragAccessService.requireMember(document.getCalendar().getId(), userId);
        return new DocumentStatusResponse(
                document.getId(),
                document.getStatus(),
                document.getChunkCount(),
                document.getUpdatedAt()
        );
    }

    @Transactional(readOnly = true)
    public ChatQueryResponse query(Long userId, ChatQueryRequest request) {
        if (request.question() == null || request.question().isBlank()) {
            throw new IllegalArgumentException("question은 필수입니다.");
        }
        if (request.calendarId() == null) {
            throw new IllegalArgumentException("calendarId는 필수입니다.");
        }
        ragAccessService.requireMember(request.calendarId(), userId);

        List<Long> requestedIds = request.documentIds() == null ? List.of() : request.documentIds();
        List<RagDocument> ownedDocs = ragDocumentRepository.findByCalendarIdAndOwnerId(request.calendarId(), userId);
        Map<Long, RagDocument> allowedDocMap = ownedDocs.stream()
                .collect(Collectors.toMap(RagDocument::getId, item -> item));

        List<Long> targetDocIds;
        if (requestedIds.isEmpty()) {
            targetDocIds = new ArrayList<>(allowedDocMap.keySet());
        } else {
            targetDocIds = requestedIds.stream()
                    .filter(allowedDocMap::containsKey)
                    .toList();
        }
        if (targetDocIds.isEmpty()) {
            throw new IllegalArgumentException("조회 가능한 문서가 없습니다.");
        }

        PythonQueryResponse pythonResponse = pythonRagClient.query(new PythonQueryRequest(
                request.question(),
                userId,
                request.calendarId(),
                targetDocIds,
                vectorBucket,
                vectorIndex,
                embeddingModel,
                request.topK() == null ? 6 : request.topK()
        ));

        List<ChatSourceResponse> sources = new ArrayList<>();
        if (pythonResponse != null && pythonResponse.retrievals() != null) {
            for (PythonQueryResponse.PythonRetrieval retrieval : pythonResponse.retrievals()) {
                Map<String, Object> metadata = retrieval.metadata();
                Long documentId = toLong(metadata == null ? null : metadata.get("documentId"));
                String title = documentId != null && allowedDocMap.containsKey(documentId)
                        ? allowedDocMap.get(documentId).getTitle()
                        : "Unknown";
                String preview = metadata == null ? null : String.valueOf(metadata.getOrDefault("preview", ""));
                Double score = retrieval.distance() == null ? null : (1.0d - retrieval.distance());
                sources.add(new ChatSourceResponse(documentId, title, retrieval.key(), score, preview));
            }
        }

        String answer = pythonResponse == null || pythonResponse.answer() == null
                ? "답변을 생성하지 못했습니다."
                : pythonResponse.answer();
        return new ChatQueryResponse(answer, sources);
    }

    private RagDocument getOwnedDocument(Long userId, Long documentId) {
        return ragDocumentRepository.findByIdAndOwnerId(documentId, userId)
                .orElseThrow(() -> new IllegalArgumentException("문서를 찾을 수 없습니다."));
    }

    private String sanitizeFileName(String fileName) {
        return fileName.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    private List<String> splitTags(String tagsCsv) {
        if (tagsCsv == null || tagsCsv.isBlank()) {
            return List.of();
        }
        return List.of(tagsCsv.split(","));
    }

    private Long toLong(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        if (value instanceof String text && !text.isBlank()) {
            return Long.parseLong(text);
        }
        return null;
    }
}
