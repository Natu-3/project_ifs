package com.example.backwork.redis;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
public class RedisSubscriber {
    private SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;

    public void onMessage(String message, String pattern) throws Exception {
        ScheduleEvent event = objectMapper.readValue(message, ScheduleEvent.class);

        messagingTemplate.convertAndSend(
                "/topic/team/" + event.getTeamId(),
                event
        );
    }
}
