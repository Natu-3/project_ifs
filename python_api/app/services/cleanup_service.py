import asyncio
import logging

from app.db.session import get_session_factory
from app.services.chat_service import ChatService


logger = logging.getLogger(__name__)


async def run_daily_cleanup() -> None:
    while True:
        # 앱 실행 중 24시간 주기로 만료 세션을 정리한다.
        db = get_session_factory()()
        try:
            deleted = ChatService(db).cleanup_expired()
            logger.info("expired chat cleanup executed, deleted=%s", deleted)
        finally:
            db.close()
        await asyncio.sleep(60 * 60 * 24)
