from collections import defaultdict, deque
from threading import Lock
from time import time


class InMemoryRateLimiter:
    def __init__(self) -> None:
        # user_id별 요청 시각 버퍼를 유지한다.
        self._requests: dict[int, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def allow(self, user_id: int, max_requests: int, window_seconds: int = 60) -> bool:
        # 고정 시간 창(window) 내 요청 수를 계산해 허용 여부를 반환한다.
        now = time()
        with self._lock:
            q = self._requests[user_id]
            while q and (now - q[0] > window_seconds):
                q.popleft()
            if len(q) >= max_requests:
                return False
            q.append(now)
            return True
