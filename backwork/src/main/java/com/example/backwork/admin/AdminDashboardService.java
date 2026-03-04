package com.example.backwork.admin;

import com.example.backwork.admin.dto.AdminDashboardTodayResponse;
import com.example.backwork.admin.dto.AdminUserItemResponse;
import com.example.backwork.admin.dto.AdminUserListResponse;
import com.example.backwork.member.User;
import com.example.backwork.member.UserRepository;
import com.example.backwork.rag.DocumentStatus;
import com.example.backwork.rag.PythonRagClient;
import com.example.backwork.rag.RagDocument;
import com.example.backwork.rag.RagDocumentRepository;
import com.example.backwork.rag.internal.PythonQueryRequest;
import com.example.backwork.rag.internal.PythonQueryResponse;
import com.example.backwork.schedule.entity.Schedule;
import com.example.backwork.schedule.repository.ScheduleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class AdminDashboardService {

    private static final String TIMEZONE = "Asia/Seoul";

    private final UserRepository userRepository;
    private final ScheduleRepository scheduleRepository;
    private final RagDocumentRepository ragDocumentRepository;
    private final PythonRagClient pythonRagClient;

    @Value("${rag.vector-bucket:mock-rag-dev}")
    private String vectorBucket;

    @Value("${rag.vector-index:knowledge-base}")
    private String vectorIndex;

    @Value("${rag.embedding-model:text-embedding-3-small}")
    private String embeddingModel;

    @Transactional(readOnly = true)
    public AdminDashboardTodayResponse getTodayDashboard() {
        ZoneId zoneId = ZoneId.of(TIMEZONE);
        ZonedDateTime now = ZonedDateTime.now(zoneId);
        LocalDate today = now.toLocalDate();
        LocalDateTime windowStart = today.atStartOfDay();
        LocalDateTime windowEnd = today.atTime(23, 59, 59);

        long userCount = userRepository.countBy();
        List<Schedule> todaySchedules = scheduleRepository.findByCreatedAtBetweenWithCalendarAndOwner(windowStart, windowEnd);
        long todayScheduleCount = todaySchedules.size();

        if (todaySchedules.isEmpty()) {
            return new AdminDashboardTodayResponse(
                    LocalDateTime.now(),
                    TIMEZONE,
                    userCount,
                    0,
                    "오늘 생성된 일정이 없습니다.",
                    "FALLBACK",
                    windowStart,
                    windowEnd,
                    0,
                    0
            );
        }

        Map<Long, List<Schedule>> schedulesByCalendar = todaySchedules.stream()
                .collect(Collectors.groupingBy(item -> item.getCalendar().getId(), LinkedHashMap::new, Collectors.toList()));
        List<Long> calendarIds = new ArrayList<>(schedulesByCalendar.keySet());

        List<RagDocument> readyDocs = ragDocumentRepository.findByCalendarIdInAndStatus(calendarIds, DocumentStatus.READY);
        Map<Long, List<RagDocument>> docsByCalendar = readyDocs.stream()
                .collect(Collectors.groupingBy(item -> item.getCalendar().getId(), LinkedHashMap::new, Collectors.toList()));

        String baseScheduleSummary = buildScheduleSummary(todaySchedules);
        if (readyDocs.isEmpty()) {
            return new AdminDashboardTodayResponse(
                    LocalDateTime.now(),
                    TIMEZONE,
                    userCount,
                    todayScheduleCount,
                    baseScheduleSummary,
                    "PARTIAL",
                    windowStart,
                    windowEnd,
                    calendarIds.size(),
                    0
            );
        }

        int sourceCount = 0;
        List<String> insights = new ArrayList<>();
        for (Map.Entry<Long, List<Schedule>> entry : schedulesByCalendar.entrySet()) {
            Long calendarId = entry.getKey();
            List<RagDocument> docs = docsByCalendar.getOrDefault(calendarId, List.of());
            if (docs.isEmpty()) {
                continue;
            }

            List<Long> docIds = docs.stream().map(RagDocument::getId).toList();
            String calendarContext = buildCalendarScheduleContext(entry.getValue());
            String question = """
                    관리자 운영 요약을 생성해 주세요.
                    아래 일정 데이터와 문서를 함께 참고해 핵심 주제, 위험/충돌, 후속 액션을 3~5줄로 요약하세요.
                    
                    [오늘 생성 일정]
                    %s
                    """.formatted(calendarContext);

            try {
                PythonQueryResponse response = pythonRagClient.query(new PythonQueryRequest(
                        question,
                        null,
                        calendarId,
                        docIds,
                        vectorBucket,
                        vectorIndex,
                        embeddingModel,
                        4
                ));
                if (response != null && response.answer() != null && !response.answer().isBlank()) {
                    String calendarName = entry.getValue().get(0).getCalendar().getName();
                    insights.add("[%s] %s".formatted(calendarName, response.answer().trim()));
                }
                if (response != null && response.retrievals() != null) {
                    sourceCount += response.retrievals().size();
                }
            } catch (Exception e) {
                log.warn("admin dashboard rag summary failed. calendarId={}", calendarId, e);
            }
        }

        String finalSummary;
        String status;
        if (insights.isEmpty()) {
            finalSummary = baseScheduleSummary;
            status = "PARTIAL";
        } else {
            finalSummary = baseScheduleSummary + "\n\n[RAG 문맥 인사이트]\n" + String.join("\n", insights);
            status = "COMPLETED";
        }

        return new AdminDashboardTodayResponse(
                LocalDateTime.now(),
                TIMEZONE,
                userCount,
                todayScheduleCount,
                finalSummary,
                status,
                windowStart,
                windowEnd,
                calendarIds.size(),
                sourceCount
        );
    }

    @Transactional(readOnly = true)
    public AdminUserListResponse getUsers(int page, int size, String keyword) {
        int normalizedPage = Math.max(page, 0);
        int normalizedSize = Math.min(Math.max(size, 1), 100);
        Pageable pageable = PageRequest.of(normalizedPage, normalizedSize, Sort.by(Sort.Direction.DESC, "id"));
        Page<User> result = userRepository.searchUsers(keyword, pageable);

        List<AdminUserItemResponse> items = result.getContent().stream()
                .map(this::toUserItem)
                .toList();

        return new AdminUserListResponse(items, result.getNumber(), result.getSize(), result.getTotalElements(), result.getTotalPages());
    }

    public AdminUserItemResponse updateUserRole(Long actorUserId, Long targetUserId, String nextAuthRaw) {
        if (nextAuthRaw == null || nextAuthRaw.isBlank()) {
            throw new IllegalArgumentException("auth is required");
        }
        String nextAuth = nextAuthRaw.trim().toUpperCase(Locale.ROOT);
        if (!nextAuth.equals("USER") && !nextAuth.equals("ADMIN")) {
            throw new IllegalArgumentException("auth must be USER or ADMIN");
        }

        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("user not found"));
        String currentAuth = target.getAuth() == null ? "USER" : target.getAuth().toUpperCase(Locale.ROOT);
        if (currentAuth.equals(nextAuth)) {
            return toUserItem(target);
        }

        if (currentAuth.equals("ADMIN") && nextAuth.equals("USER")) {
            long adminCount = userRepository.countByAuth("ADMIN");
            if (adminCount <= 1) {
                throw new IllegalStateException("마지막 ADMIN 계정은 USER로 변경할 수 없습니다.");
            }
        }

        target.setAuth(nextAuth);
        User saved = userRepository.save(target);
        log.info("admin role changed actorUserId={} targetUserId={} from={} to={}",
                actorUserId, targetUserId, currentAuth, nextAuth);
        return toUserItem(saved);
    }

    public AdminUserItemResponse markResetPasswordRequired(Long actorUserId, Long targetUserId) {
        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("user not found"));
        target.setMustChangePassword(true);
        User saved = userRepository.save(target);
        log.info("admin marked mustChangePassword actorUserId={} targetUserId={}", actorUserId, targetUserId);
        return toUserItem(saved);
    }

    private AdminUserItemResponse toUserItem(User user) {
        return new AdminUserItemResponse(
                user.getId(),
                user.getUserid(),
                user.getName(),
                user.getEmail(),
                user.getAuth(),
                user.getCreatedAt(),
                user.isMustChangePassword()
        );
    }

    private String buildScheduleSummary(List<Schedule> schedules) {
        List<String> lines = new ArrayList<>();
        lines.add("오늘 생성 일정 요약");
        lines.add("- 총 일정 수: %d".formatted(schedules.size()));
        Map<String, Long> byCalendar = schedules.stream()
                .collect(Collectors.groupingBy(item -> item.getCalendar().getName(), LinkedHashMap::new, Collectors.counting()));
        for (Map.Entry<String, Long> entry : byCalendar.entrySet()) {
            lines.add("- %s: %d건".formatted(entry.getKey(), entry.getValue()));
        }
        lines.add("");
        lines.add("주요 일정");
        schedules.stream().limit(12).forEach(item -> {
            String content = item.getContent() == null ? "" : item.getContent().replace("\n", " ");
            if (content.length() > 80) {
                content = content.substring(0, 80) + "...";
            }
            lines.add("* [%s] %s (%s ~ %s) %s".formatted(
                    item.getCalendar().getName(),
                    item.getTitle(),
                    item.getStartAt(),
                    item.getEndAt(),
                    content
            ));
        });
        return String.join("\n", lines);
    }

    private String buildCalendarScheduleContext(List<Schedule> schedules) {
        StringBuilder builder = new StringBuilder();
        schedules.stream().limit(20).forEach(item -> {
            String content = item.getContent() == null ? "" : item.getContent().replace("\n", " ");
            if (content.length() > 120) {
                content = content.substring(0, 120) + "...";
            }
            builder.append("- title=").append(item.getTitle())
                    .append(", start=").append(item.getStartAt())
                    .append(", end=").append(item.getEndAt())
                    .append(", priority=").append(item.getPriority())
                    .append(", content=").append(content)
                    .append("\n");
        });
        return builder.toString();
    }
}

