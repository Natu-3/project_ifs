package com.example.backwork.teamsch.lock.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.connection.RedisStringCommands;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.types.Expiration;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Collections;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class RedisTeamCalendarLockService implements TeamCalendarLockService {
    /*
     * Redis command policy
     * - acquire : SET key value NX PX 15000
     * - refresh : Lua (GET == owner) ? PEXPIRE : 0
     * - release : Lua (GET == owner) ? DEL : 0
     * - owner   : GET key
     * - ttl     : TTL key
     */

    private static final String REFRESH_SCRIPT_TEXT =
            "if redis.call('GET', KEYS[1]) == ARGV[1] then " +
                    "return redis.call('PEXPIRE', KEYS[1], ARGV[2]) " +
                    "else return 0 end";

    private static final String RELEASE_SCRIPT_TEXT =
            "if redis.call('GET', KEYS[1]) == ARGV[1] then " +
                    "return redis.call('DEL', KEYS[1]) " +
                    "else return 0 end";

    private static final DefaultRedisScript<Long> REFRESH_SCRIPT = createLongScript(REFRESH_SCRIPT_TEXT);
    private static final DefaultRedisScript<Long> RELEASE_SCRIPT = createLongScript(RELEASE_SCRIPT_TEXT);

    private final StringRedisTemplate redisTemplate;

    @Override
    public LockResult acquire(String key, Long userId, String sessionId, Duration ttl) {
        validateOwner(userId, sessionId);
        Duration validTtl = normalizeTtl(ttl);
        String value = toLockValue(userId, sessionId);

        RedisCallback<Boolean> acquireCallback = connection ->
                connection.stringCommands().set(
                        key.getBytes(StandardCharsets.UTF_8),
                        value.getBytes(StandardCharsets.UTF_8),
                        Expiration.milliseconds(validTtl.toMillis()),
                        RedisStringCommands.SetOption.ifAbsent()
                );

        Boolean acquired = redisTemplate.execute(acquireCallback);
        if (Boolean.TRUE.equals(acquired)) {
            return new LockResult(true, new LockOwner(userId, sessionId), validTtl.toSeconds());
        }

        LockOwner owner = getOwner(key).orElse(null);
        return new LockResult(false, owner, getTtlSeconds(key));
    }

    @Override
    public LockResult refresh(String key, Long userId, String sessionId, Duration ttl) {
        validateOwner(userId, sessionId);
        Duration validTtl = normalizeTtl(ttl);

        Long result = redisTemplate.execute(
                REFRESH_SCRIPT,
                Collections.singletonList(key),
                toLockValue(userId, sessionId),
                String.valueOf(validTtl.toMillis())
        );

        if (result != null && result > 0) {
            return new LockResult(true, new LockOwner(userId, sessionId), validTtl.toSeconds());
        }

        LockOwner owner = getOwner(key).orElse(null);
        return new LockResult(false, owner, getTtlSeconds(key));
    }

    @Override
    public void release(String key, Long userId, String sessionId) {
        validateOwner(userId, sessionId);

        redisTemplate.execute(
                RELEASE_SCRIPT,
                Collections.singletonList(key),
                toLockValue(userId, sessionId)
        );
    }

    @Override
    public Optional<LockOwner> getOwner(String key) {
        String value = redisTemplate.opsForValue().get(key);
        if (value == null || value.isBlank()) {
            return Optional.empty();
        }

        String[] split = value.split(":", 2);
        if (split.length < 2) {
            return Optional.empty();
        }

        try {
            Long userId = Long.valueOf(split[0]);
            return Optional.of(new LockOwner(userId, split[1]));
        } catch (NumberFormatException ignored) {
            return Optional.empty();
        }
    }

    @Override
    public Long getTtlSeconds(String key) {
        Long ttl = redisTemplate.getExpire(key, TimeUnit.SECONDS);
        if (ttl == null || ttl < 0) {
            return 0L;
        }
        return ttl;
    }

    @Override
    public boolean isLockOwner(String key, Long userId, String sessionId) {
        validateOwner(userId, sessionId);

        Optional<LockOwner> owner = getOwner(key);
        if (owner.isEmpty()) {
            return false;
        }

        return owner.get().getUserId().equals(userId)
                && owner.get().getSessionId().equals(sessionId);
    }

    @Override
    public void requireLockOwner(String key, Long userId, String sessionId) {
        validateOwner(userId, sessionId);

        Optional<LockOwner> owner = getOwner(key);
        if (owner.isEmpty()) {
            throw new IllegalStateException("락이 없어 수정할 수 없습니다.");
        }

        boolean isOwner = owner.get().getUserId().equals(userId)
                && owner.get().getSessionId().equals(sessionId);

        if (!isOwner) {
            throw new SecurityException("락 소유자만 수정할 수 있습니다.");
        }
    }

    private String toLockValue(Long userId, String sessionId) {
        return userId + ":" + sessionId;
    }

    private void validateOwner(Long userId, String sessionId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId는 필수입니다.");
        }
        if (sessionId == null || sessionId.isBlank()) {
            throw new IllegalArgumentException("sessionId는 필수입니다.");
        }
    }

    private Duration normalizeTtl(Duration ttl) {
        if (ttl == null || ttl.isZero() || ttl.isNegative()) {
            return LOCK_TTL;
        }

        if (ttl.toSeconds() != LOCK_TTL.toSeconds()) {
            return LOCK_TTL;
        }

        return ttl;
    }

    private static DefaultRedisScript<Long> createLongScript(String scriptText) {
        DefaultRedisScript<Long> script = new DefaultRedisScript<>();
        script.setScriptText(scriptText);
        script.setResultType(Long.class);
        return script;
    }
}