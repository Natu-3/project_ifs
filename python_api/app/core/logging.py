import json
import logging
import re
from datetime import datetime, timezone


EMAIL_PATTERN = re.compile(r"([A-Za-z0-9._%+-]{2})[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})")
PHONE_PATTERN = re.compile(r"(?<!\d)(01[016789]-?\d{3,4}-?\d{4})(?!\d)")


def mask_sensitive(text: str) -> str:
    if not text:
        return text

    masked = EMAIL_PATTERN.sub(r"\1***@\2", text)
    masked = PHONE_PATTERN.sub("***-****-****", masked)
    return masked


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": mask_sensitive(record.getMessage()),
        }

        trace_id = getattr(record, "trace_id", None)
        if trace_id:
            payload["trace_id"] = trace_id

        status_code = getattr(record, "status_code", None)
        if status_code is not None:
            payload["status_code"] = status_code

        latency_ms = getattr(record, "latency_ms", None)
        if latency_ms is not None:
            payload["latency_ms"] = latency_ms

        token_in = getattr(record, "token_in", None)
        token_out = getattr(record, "token_out", None)
        if token_in is not None:
            payload["token_in"] = token_in
        if token_out is not None:
            payload["token_out"] = token_out

        return json.dumps(payload, ensure_ascii=True)


def configure_logging(level: str) -> None:
    root = logging.getLogger()
    root.handlers.clear()
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    root.addHandler(handler)
    root.setLevel(level.upper())

