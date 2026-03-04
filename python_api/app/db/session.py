from collections.abc import Generator
from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings


@lru_cache
def get_engine():
    settings = get_settings()
    return create_engine(settings.sqlalchemy_database_url, pool_pre_ping=True)
# 전역 엔진/세션팩토리를 재사용해 연결 오버헤드를 줄인다.
@lru_cache
def get_session_factory():
    return sessionmaker(bind=get_engine(), autoflush=False, autocommit=False, class_=Session)


def get_db() -> Generator[Session, None, None]:
    # FastAPI dependency로 요청 단위 DB 세션을 열고 종료 시 반드시 닫는다.
    db = get_session_factory()()
    try:
        yield db
    finally:
        db.close()
