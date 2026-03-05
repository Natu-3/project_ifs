package com.example.backwork.assistant;

import com.example.backwork.assistant.dto.AssistantChatRequest;
import com.example.backwork.assistant.dto.AssistantChatResponse;
import com.example.backwork.assistant.internal.PythonAssistantParseRequest;
import com.example.backwork.assistant.internal.PythonAssistantParseResponse;
import com.example.backwork.calendar.CalendarService;
import com.example.backwork.rag.RagDocumentService;
import com.example.backwork.rag.dto.ChatQueryRequest;
import com.example.backwork.rag.dto.ChatQueryResponse;
import com.example.backwork.schedule.entity.Schedule;
import com.example.backwork.schedule.service.ScheduleService;
import com.example.backwork.teamsch.service.TeamScheduleService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AssistantChatService {

    private static final String DEFAULT_TIMEZONE = "Asia/Seoul";
    private static final String INTENT_CREATE = "CREATE_SCHEDULE";
    private static final String INTENT_SUMMARY = "SUMMARY_SCHEDULE";
    private static final String INTENT_GENERAL = "GENERAL";

    private final PythonAssistantClient pythonAssistantClient;
    private final CalendarService calendarService;
    private final ScheduleService scheduleService;
    private final TeamScheduleService teamScheduleService;
    private final RagDocumentService ragDocumentService;

    public AssistantChatResponse chat(Long userId, AssistantChatRequest request) {
        // 단일 진입점: 의도 분류 -> 등록/요약/RAG 폴백 실행
        String message = request.message() == null ? "" : request.message().trim();
        if (message.isBlank()) {
            throw new IllegalArgumentException("message is required.");
        }

        String timezone = (request.timezone() == null || request.timezone().isBlank())
                ? DEFAULT_TIMEZONE
                : request.timezone().trim();
        ZoneId zoneId = ZoneId.of(timezone);
        List<AssistantChatResponse.CalendarOption> options = calendarService.getAssistantCalendarOptions(userId);

        PythonAssistantParseResponse parsed = parseWithFallback(request, timezone);
        String intent = parsed.intent() == null ? INTENT_GENERAL : parsed.intent();

        if (INTENT_CREATE.equals(intent)) {
            // 등록 의도는 항상 캘린더 명시 선택이 필요하다.
            AssistantChatResponse.CalendarOption selected = resolveSelectedCalendar(
                    message,
                    options
            );
            if (selected == null) {
                return new AssistantChatResponse(
                        "어느 캘린더에 추가할까요?",
                        INTENT_CREATE,
                        "NEEDS_CALENDAR_SELECTION",
                        options,
                        null,
                        null
                );
            }

            LocalDateTime startAt = parseDateTime(parsed.startAt());
            LocalDateTime endAt = parseDateTime(parsed.endAt());
            if (startAt == null) {
                return new AssistantChatResponse(
                        "날짜/시간을 다시 알려주세요. 예: 3월 10일 14시 팀 회의",
                        "CLARIFY",
                        "MISSING_DATETIME",
                        null,
                        null,
                        null
                );
            }

            // 챗봇 일정은 시간 정보 대신 날짜(종일) 기준으로 저장
            LocalDate startDate = startAt.toLocalDate();
            LocalDate endDate = endAt == null ? startDate : endAt.toLocalDate();
            if (endDate.isBefore(startDate)) {
                LocalDate tmp = startDate;
                startDate = endDate;
                endDate = tmp;
            }

            String title = parsed.title();
            if (title == null || title.isBlank()) {
                title = message.length() > 30 ? message.substring(0, 30) : message;
            }
            String content = parsed.content();

            List<Schedule> createdSchedules = new ArrayList<>();
            for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
                LocalDateTime dayStart = date.atStartOfDay();
                LocalDateTime dayEnd = date.atTime(23, 59, 59);

                Schedule created;
                if ("TEAM".equalsIgnoreCase(selected.type())) {
                    created = teamScheduleService.createFromAssistant(
                            userId,
                            selected.id(),
                            title,
                            content,
                            dayStart,
                            dayEnd
                    );
                } else {
                    created = scheduleService.createFromAssistant(
                            userId,
                            title,
                            content,
                            dayStart,
                            dayEnd
                    );
                }
                createdSchedules.add(created);
            }

            Schedule representative = createdSchedules.get(0);
            AssistantChatResponse.CreatedSchedule createdSchedule = new AssistantChatResponse.CreatedSchedule(
                    representative.getId(),
                    representative.getTitle(),
                    representative.getStartAt(),
                    representative.getEndAt(),
                    selected.type(),
                    selected.id()
            );

            String reply = createdSchedules.size() == 1
                    ? "%s 캘린더에 일정을 등록했습니다: %s (%s)".formatted(
                    selected.name(),
                    representative.getTitle(),
                    representative.getStartAt().toLocalDate()
            )
                    : "%s 캘린더에 %s ~ %s 기간으로 동일 일정 %d건을 등록했습니다: %s".formatted(
                    selected.name(),
                    startDate,
                    endDate,
                    createdSchedules.size(),
                    representative.getTitle()
            );

            return new AssistantChatResponse(reply, INTENT_CREATE, "COMPLETED", null, createdSchedule, null);
        }

        if (INTENT_SUMMARY.equals(intent)) {
            // 요약은 기본적으로 "현재월 + 활성 캘린더" 정책을 사용
            AssistantChatResponse.CalendarOption targetCalendar = resolveTargetCalendar(options, request.activeCalendar(), message);
            LocalDateTime startAt = parseDateTime(parsed.startAt());
            LocalDateTime endAt = parseDateTime(parsed.endAt());
            if (startAt == null || endAt == null) {
                ZonedDateTime now = ZonedDateTime.now(zoneId);
                LocalDate firstDay = now.toLocalDate().withDayOfMonth(1);
                LocalDate lastDay = firstDay.plusMonths(1).minusDays(1);
                startAt = firstDay.atStartOfDay();
                endAt = lastDay.atTime(23, 59, 59);
            }

            List<Schedule> schedules = "TEAM".equalsIgnoreCase(targetCalendar.type())
                    ? teamScheduleService.findByRange(userId, targetCalendar.id(), startAt, endAt)
                    : scheduleService.findByRange(userId, startAt, endAt);

            String summary = buildSummary(targetCalendar.name(), startAt, endAt, schedules);
            return new AssistantChatResponse(summary, INTENT_SUMMARY, "COMPLETED", null, null, summary);
        }

        AssistantChatResponse.CalendarOption ragCalendar = resolveTargetCalendar(options, request.activeCalendar(), message);
        Long ragCalendarId = "TEAM".equalsIgnoreCase(ragCalendar.type())
                ? ragCalendar.id()
                : calendarService.getPersonalCalendarId(userId);

        if (ragCalendarId == null) {
            return new AssistantChatResponse(
                    "질문을 처리할 수 있는 캘린더를 찾지 못했습니다.",
                    INTENT_GENERAL,
                    "FAILED",
                    null,
                    null,
                    null
            );
        }

        try {
            // 일반 질의는 기존 RAG query를 재사용한다.
            ChatQueryResponse rag = ragDocumentService.query(
                    userId,
                    new ChatQueryRequest(message, ragCalendarId, List.of(), 6)
            );
            return new AssistantChatResponse(rag.answer(), INTENT_GENERAL, "COMPLETED", null, null, null);
        } catch (Exception e) {
            return new AssistantChatResponse(
                    "일반 질문 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
                    INTENT_GENERAL,
                    "FAILED",
                    null,
                    null,
                    null
            );
        }
    }

    private PythonAssistantParseResponse parseWithFallback(AssistantChatRequest request, String timezone) {
        try {
            List<PythonAssistantParseRequest.ConversationMessage> conversation = request.conversation() == null
                    ? List.of()
                    : request.conversation().stream()
                    .map(item -> new PythonAssistantParseRequest.ConversationMessage(item.role(), item.content()))
                    .toList();
            // Python 파서가 1차 의도/날짜 정규화를 수행
            return pythonAssistantClient.parse(new PythonAssistantParseRequest(
                    request.message(),
                    conversation,
                    timezone,
                    ZonedDateTime.now(ZoneId.of(timezone)).toString()
            ));
        } catch (Exception e) {
            // Python 파서 장애 시 키워드 기반 최소 분류로 폴백
            String text = request.message() == null ? "" : request.message().toLowerCase(Locale.ROOT);
            String intent = (text.contains("요약") || text.contains("summary")) ? INTENT_SUMMARY : INTENT_GENERAL;
            if (text.contains("추가") || text.contains("등록") || text.contains("일정")) {
                intent = INTENT_CREATE;
            }
            return new PythonAssistantParseResponse(intent, null, null, null, null, true, List.of(), true);
        }
    }

    private AssistantChatResponse.CalendarOption resolveSelectedCalendar(
            String message,
            List<AssistantChatResponse.CalendarOption> options
    ) {
        String lower = message.toLowerCase(Locale.ROOT);
        for (AssistantChatResponse.CalendarOption option : options) {
            if (option.name() != null && !option.name().isBlank()) {
                if (lower.contains(option.name().toLowerCase(Locale.ROOT))) {
                    return option;
                }
            }
            if (option.id() != null && lower.contains(String.valueOf(option.id()))) {
                return option;
            }
        }
        if (lower.contains("개인") || lower.contains("personal")) {
            return options.stream()
                    .filter(option -> "PERSONAL".equalsIgnoreCase(option.type()))
                    .findFirst()
                    .orElse(null);
        }
        return null;
    }

    private AssistantChatResponse.CalendarOption resolveTargetCalendar(
            List<AssistantChatResponse.CalendarOption> options,
            AssistantChatRequest.ActiveCalendar activeCalendar,
            String message
    ) {
        AssistantChatResponse.CalendarOption byMessage = resolveSelectedCalendar(message, options);
        if (byMessage != null) {
            return byMessage;
        }
        if (activeCalendar != null && "TEAM".equalsIgnoreCase(activeCalendar.type()) && activeCalendar.id() != null) {
            for (AssistantChatResponse.CalendarOption option : options) {
                if ("TEAM".equalsIgnoreCase(option.type()) && activeCalendar.id().equals(option.id())) {
                    return option;
                }
            }
        }
        return options.stream()
                .filter(option -> "PERSONAL".equalsIgnoreCase(option.type()))
                .findFirst()
                .orElseGet(() -> options.get(0));
    }

    private LocalDateTime parseDateTime(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalDateTime.parse(value);
        } catch (DateTimeParseException ignored) {
            return null;
        }
    }

    private String buildSummary(String calendarName, LocalDateTime startAt, LocalDateTime endAt, List<Schedule> schedules) {
        if (schedules == null || schedules.isEmpty()) {
            return "%s 일정 요약 (%s ~ %s): 등록된 일정이 없습니다.".formatted(calendarName, startAt.toLocalDate(), endAt.toLocalDate());
        }

        Map<LocalDate, List<Schedule>> grouped = schedules.stream()
                .sorted(Comparator.comparing(Schedule::getStartAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .collect(Collectors.groupingBy(
                        item -> item.getStartAt() == null ? startAt.toLocalDate() : item.getStartAt().toLocalDate(),
                        java.util.TreeMap::new,
                        Collectors.toList()
                ));

        List<String> lines = new ArrayList<>();
        lines.add("%s 일정 요약 (%s ~ %s)".formatted(calendarName, startAt.toLocalDate(), endAt.toLocalDate()));
        for (Map.Entry<LocalDate, List<Schedule>> entry : grouped.entrySet()) {
            lines.add("%s".formatted(entry.getKey()));
            for (Schedule schedule : entry.getValue()) {
                lines.add("- %s".formatted(schedule.getTitle()));
            }
        }
        return String.join("\n", lines);
    }
}
