package com.example.backwork.assistant;

import com.example.backwork.assistant.internal.PythonAssistantParseRequest;
import com.example.backwork.assistant.internal.PythonAssistantParseResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
@RequiredArgsConstructor
public class PythonAssistantClient {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${python.api.base-url:http://python_api:8000}")
    private String pythonApiBaseUrl;

    @Value("${internal.api.token:dev-internal-token}")
    private String internalApiToken;

    public PythonAssistantParseResponse parse(PythonAssistantParseRequest request) {
        // Spring -> Python 내부 파서 호출(의도/날짜 추출 전용)
        HttpEntity<PythonAssistantParseRequest> entity = new HttpEntity<>(request, buildHeaders());
        ResponseEntity<PythonAssistantParseResponse> response = restTemplate.exchange(
                pythonApiBaseUrl + "/internal/assistant/parse",
                HttpMethod.POST,
                entity,
                PythonAssistantParseResponse.class
        );
        return response.getBody();
    }

    private HttpHeaders buildHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        // 내부 엔드포인트는 공유 토큰으로만 접근 허용
        headers.set("X-Internal-Token", internalApiToken);
        return headers;
    }
}
