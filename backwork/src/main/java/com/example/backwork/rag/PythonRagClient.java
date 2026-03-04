package com.example.backwork.rag;

import com.example.backwork.rag.internal.PythonIngestRequest;
import com.example.backwork.rag.internal.PythonIngestResponse;
import com.example.backwork.rag.internal.PythonQueryRequest;
import com.example.backwork.rag.internal.PythonQueryResponse;
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
public class PythonRagClient {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${python.api.base-url:http://python_api:8000}")
    private String pythonApiBaseUrl;

    @Value("${internal.api.token:dev-internal-token}")
    private String internalApiToken;

    public PythonIngestResponse ingest(PythonIngestRequest request) {
        HttpEntity<PythonIngestRequest> entity = new HttpEntity<>(request, buildHeaders());
        ResponseEntity<PythonIngestResponse> response = restTemplate.exchange(
                pythonApiBaseUrl + "/internal/rag/ingest",
                HttpMethod.POST,
                entity,
                PythonIngestResponse.class
        );
        return response.getBody();
    }

    public PythonQueryResponse query(PythonQueryRequest request) {
        HttpEntity<PythonQueryRequest> entity = new HttpEntity<>(request, buildHeaders());
        ResponseEntity<PythonQueryResponse> response = restTemplate.exchange(
                pythonApiBaseUrl + "/internal/rag/query",
                HttpMethod.POST,
                entity,
                PythonQueryResponse.class
        );
        return response.getBody();
    }

    private HttpHeaders buildHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Internal-Token", internalApiToken);
        return headers;
    }
}
