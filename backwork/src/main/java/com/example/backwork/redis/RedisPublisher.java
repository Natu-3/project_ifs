package com.example.backwork.redis;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
public class RedisPublisher {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;


    // 채널과 메시지 형태로 수신받았을 때 = publish 상황
    public void publish(String channel, Object message) throws Exception{
        String json = objectMapper.writeValueAsString(message);
        redisTemplate.convertAndSend(channel,json);
    }
}
