import asyncio
import contextlib
import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api.routes import router
from app.core.config import get_settings
from app.core.errors import AppError
from app.core.logging import configure_logging
from app.schemas.chat import ErrorResponse
from app.services.cleanup_service import run_daily_cleanup


settings = get_settings()
configure_logging(settings.log_level)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    # 서버 시작 시 만료 대화 정리 루프를 백그라운드로 시작한다.
    cleanup_task = asyncio.create_task(run_daily_cleanup())
    try:
        yield
    finally:
        # 서버 종료 시 백그라운드 작업을 안전하게 정리한다.
        cleanup_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await cleanup_task


app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan)
app.include_router(router)


@app.middleware("http")
async def trace_middleware(request: Request, call_next):
    # 각 요청에 trace_id를 부여해 로그/에러 응답을 상호 추적 가능하게 만든다.
    trace_id = request.headers.get("x-trace-id") or str(uuid.uuid4())
    request.state.trace_id = trace_id
    start = time.perf_counter()

    response = await call_next(request)
    response.headers["x-trace-id"] = trace_id

    # 요청 지연시간을 공통 포맷으로 기록한다.
    latency_ms = round((time.perf_counter() - start) * 1000, 2)
    logger.info(
        "%s %s",
        request.method,
        request.url.path,
        extra={"trace_id": trace_id, "status_code": response.status_code, "latency_ms": latency_ms},
    )
    return response


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    # 서비스에서 의도적으로 던진 비즈니스 오류를 표준 포맷으로 반환한다.
    trace_id = getattr(request.state, "trace_id", str(uuid.uuid4()))
    detail = exc.detail if isinstance(exc.detail, dict) else {}
    code = detail.get("code", "APP_ERROR")
    message = detail.get("message", "An error occurred while processing the request.")
    payload = ErrorResponse(code=code, message=message, trace_id=trace_id)
    return JSONResponse(status_code=exc.status_code, content=payload.model_dump())


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    # FastAPI 요청 스키마 검증 실패를 400으로 통일한다.
    trace_id = getattr(request.state, "trace_id", str(uuid.uuid4()))
    payload = ErrorResponse(code="VALIDATION_ERROR", message="Invalid request payload.", trace_id=trace_id)
    logger.warning("validation error: %s", exc, extra={"trace_id": trace_id})
    return JSONResponse(status_code=400, content=payload.model_dump())


@app.exception_handler(Exception)
async def internal_error_handler(request: Request, _: Exception):
    # 처리되지 않은 예외는 내부 오류로 변환하고 trace_id를 포함해 응답한다.
    trace_id = getattr(request.state, "trace_id", str(uuid.uuid4()))
    payload = ErrorResponse(code="INTERNAL_ERROR", message="A temporary server error occurred.", trace_id=trace_id)
    logger.exception("unexpected error", extra={"trace_id": trace_id})
    return JSONResponse(status_code=500, content=payload.model_dump())
