from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings


settings = get_settings()
# 전역 엔진/세션팩토리를 재사용해 연결 오버헤드를 줄인다.
engine = create_engine(settings.sqlalchemy_database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, class_=Session)


def get_db() -> Generator[Session, None, None]:
    # FastAPI dependency로 요청 단위 DB 세션을 열고 종료 시 반드시 닫는다.
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
