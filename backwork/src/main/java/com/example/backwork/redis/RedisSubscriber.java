package com.example.backwork.redis;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
public class RedisSubscriber {
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;

    public void onMessage(String message, String pattern) throws Exception {
        JsonNode event = objectMapper.readTree(message);
        JsonNode calendarIdNode = event.get("calendarId");
        if (calendarIdNode == null || calendarIdNode.isNull()) {
            return;
        }

        messagingTemplate.convertAndSend(
                "/topic/team/" + calendarIdNode.asLong(),
                event
        );
    }
}
