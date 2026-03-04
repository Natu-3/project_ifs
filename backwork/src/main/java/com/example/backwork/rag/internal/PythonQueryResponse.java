package com.example.backwork.rag.internal;

import java.util.List;
import java.util.Map;

public record PythonQueryResponse(
        String answer,
        List<PythonRetrieval> retrievals
) {
    public record PythonRetrieval(
            String key,
            Double distance,
            Map<String, Object> metadata
    ) {
    }
}
