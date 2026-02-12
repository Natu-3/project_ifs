package com.example.backwork.teamsch.lock;

import com.example.backwork.calendar.share.TeamCalendarAccessService;
import com.example.backwork.member.SessionUser;
import com.example.backwork.teamsch.lock.dto.LockCommandRequest;
import com.example.backwork.teamsch.lock.dto.LockCommandResponse;
import com.example.backwork.teamsch.lock.service.LockOwner;
import com.example.backwork.teamsch.lock.service.LockResult;
import com.example.backwork.teamsch.lock.service.TeamCalendarLockService;
import com.example.backwork.teamsch.lock.support.TeamCalendarLockKeyFactory;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;

@RestController
@RequestMapping("/api/team-calendars/{calendarId}/locks")
@RequiredArgsConstructor
public class TeamCalendarLockController {

    private final TeamCalendarLockService lockService;
    private final TeamCalendarAccessService accessService;
    @PostMapping("/acquire")
    public ResponseEntity<LockCommandResponse> acquire(
            @PathVariable Long calendarId,
            @RequestBody LockCommandRequest request,
            HttpServletRequest httpRequest
    ) {
        SessionUser user = getLoginUser(httpRequest);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        accessService.requireWritable(calendarId, user.getId());

        String sessionId = httpRequest.getSession(false).getId();
        String lockKey = TeamCalendarLockKeyFactory.create(calendarId, request.getTargetType(), request.getTargetId());

        LockResult result = lockService.acquire(lockKey, user.getId(), sessionId, ttlFromRequest(request));
        if (result.isSuccess()) {
            return ResponseEntity.ok(toResponse(
                    true,
                    true,
                    lockKey,
                    result,
                    "락을 획득했습니다. heartbeat는 5초마다 호출하세요."
            ));
        }

        return ResponseEntity.status(HttpStatus.LOCKED)
                .body(toResponse(false, false, lockKey, result, "다른 사용자가 편집 중입니다."));
    }

    @PostMapping("/refresh")
    public ResponseEntity<LockCommandResponse> refresh(
            @PathVariable Long calendarId,
            @RequestBody LockCommandRequest request,
            HttpServletRequest httpRequest
    ) {
        SessionUser user = getLoginUser(httpRequest);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        accessService.requireWritable(calendarId, user.getId());

        String sessionId = httpRequest.getSession(false).getId();
        String lockKey = TeamCalendarLockKeyFactory.create(calendarId, request.getTargetType(), request.getTargetId());

        LockResult result = lockService.refresh(lockKey, user.getId(), sessionId, ttlFromRequest(request));
        if (result.isSuccess()) {
            return ResponseEntity.ok(toResponse(
                    true,
                    true,
                    lockKey,
                    result,
                    "락 만료 시간을 15초로 연장했습니다."
            ));
        }

        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(toResponse(false, false, lockKey, result, "락 연장에 실패했습니다."));
    }

    @PostMapping("/release")
    public ResponseEntity<LockCommandResponse> release(
            @PathVariable Long calendarId,
            @RequestBody LockCommandRequest request,
            HttpServletRequest httpRequest
    ) {
        SessionUser user = getLoginUser(httpRequest);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        accessService.requireWritable(calendarId, user.getId());

        String sessionId = httpRequest.getSession(false).getId();
        String lockKey = TeamCalendarLockKeyFactory.create(calendarId, request.getTargetType(), request.getTargetId());

        lockService.release(lockKey, user.getId(), sessionId);
        return ResponseEntity.ok(new LockCommandResponse(
                true,
                true,
                lockKey,
                null,
                null,
                0L,
                "락을 해제했습니다."
        ));
    }

    @GetMapping
    public ResponseEntity<LockCommandResponse> status(
            @PathVariable Long calendarId,
            @RequestParam String targetId,
            @RequestParam(defaultValue = "SCHEDULE") String targetType,
            HttpServletRequest httpRequest
    ) {
        SessionUser user = getLoginUser(httpRequest);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        accessService.requireWritable(calendarId, user.getId());

        String sessionId = httpRequest.getSession(false).getId();
        String lockKey = TeamCalendarLockKeyFactory.create(
                calendarId,
                Enum.valueOf(com.example.backwork.teamsch.lock.dto.LockTargetType.class, targetType),
                targetId
        );

        LockOwner owner = lockService.getOwner(lockKey).orElse(null);
        Long ttlSeconds = lockService.getTtlSeconds(lockKey);

        boolean lockedByMe = owner != null
                && owner.getUserId().equals(user.getId())
                && owner.getSessionId().equals(sessionId);

        return ResponseEntity.ok(new LockCommandResponse(
                owner != null,
                lockedByMe,
                lockKey,
                owner != null ? owner.getUserId() : null,
                owner != null ? owner.getSessionId() : null,
                ttlSeconds,
                owner == null ? "락이 비어 있습니다." : "락이 존재합니다."
        ));
    }

    @PostMapping("/authorize-write")
    public ResponseEntity<LockCommandResponse> authorizeWrite(
            @PathVariable Long calendarId,
            @RequestBody LockCommandRequest request,
            HttpServletRequest httpRequest
    ) {
        SessionUser user = getLoginUser(httpRequest);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        accessService.requireWritable(calendarId, user.getId());

        String sessionId = httpRequest.getSession(false).getId();
        String lockKey = TeamCalendarLockKeyFactory.create(calendarId, request.getTargetType(), request.getTargetId());

        try {
            lockService.requireLockOwner(lockKey, user.getId(), sessionId);
            return ResponseEntity.ok(new LockCommandResponse(
                    true,
                    true,
                    lockKey,
                    user.getId(),
                    sessionId,
                    lockService.getTtlSeconds(lockKey),
                    "수정 권한이 확인되었습니다."
            ));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new LockCommandResponse(
                            false,
                            false,
                            lockKey,
                            null,
                            null,
                            0L,
                            e.getMessage()
                    ));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new LockCommandResponse(
                            false,
                            false,
                            lockKey,
                            null,
                            null,
                            lockService.getTtlSeconds(lockKey),
                            e.getMessage()
                    ));
        }
    }

    private LockCommandResponse toResponse(
            boolean success,
            boolean lockedByMe,
            String lockKey,
            LockResult result,
            String message
    ) {
        LockOwner owner = result.getOwner();
        return new LockCommandResponse(
                success,
                lockedByMe,
                lockKey,
                owner != null ? owner.getUserId() : null,
                owner != null ? owner.getSessionId() : null,
                result.getTtlSeconds(),
                message
        );
    }

    private Duration ttlFromRequest(LockCommandRequest request) {
        return TeamCalendarLockService.LOCK_TTL;
    }

    private SessionUser getLoginUser(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) return null;
        return (SessionUser) session.getAttribute("LOGIN_USER");
    }

    @ExceptionHandler(RedisConnectionFailureException.class)
    public ResponseEntity<LockCommandResponse> handleRedisConnectionFailure(
            RedisConnectionFailureException e
    ) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(new LockCommandResponse(
                        false,
                        false,
                        null,
                        null,
                        null,
                        0L,
                        "락 서버(Redis)에 연결할 수 없습니다. 잠시 후 다시 시도해주세요."
                ));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<LockCommandResponse> handleBadRequest(
            IllegalArgumentException e
    ) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new LockCommandResponse(
                        false,
                        false,
                        null,
                        null,
                        null,
                        0L,
                        e.getMessage() != null ? e.getMessage() : "잘못된 요청입니다."
                ));
    }
}