import { useEffect, useRef } from "react";

const EMPTY = { personal: {} };

const isEmptyPayload = (raw) => {
  if (!raw) return true;
  return raw === "{}" || raw === '{"personal":{}}';
};

export function useSchedulePersistence({ userId, calendarEvents, setCalendarEvents }) {
  const isInitialMount = useRef(true);
  const hydratedRef = useRef(false);
  const migratedGuestToUserRef = useRef(false);

  // 로그인/로그아웃 감지 → 초기화 / 복원(guest→user 마이그레이션 포함)
  useEffect(() => {
    if (!userId) {
      setCalendarEvents(EMPTY);
      hydratedRef.current = false;
      return;
    }

    try {
      const userStorageKey = `calendar_events:${userId}`;
      const guestStorageKey = "calendar_events:guest";

      // guest → user 마이그레이션(최초 1회)
      if (!migratedGuestToUserRef.current) {
        const userRaw = localStorage.getItem(userStorageKey);
        const guestRaw = localStorage.getItem(guestStorageKey);

        if (isEmptyPayload(userRaw) && !isEmptyPayload(guestRaw)) {
          localStorage.setItem(userStorageKey, guestRaw);
          const parsed = JSON.parse(guestRaw);
          setCalendarEvents(parsed && typeof parsed === "object" ? parsed : EMPTY);

          migratedGuestToUserRef.current = true;
          hydratedRef.current = true;
          return;
        }
        migratedGuestToUserRef.current = true;
      }

      // user 데이터 복원
      const saved = localStorage.getItem(userStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setCalendarEvents(parsed && typeof parsed === "object" ? parsed : EMPTY);
      } else {
        setCalendarEvents(EMPTY);
      }

      hydratedRef.current = true;
    } catch (e) {
      console.error("[ScheduleContext] 캘린더 이벤트 복원 실패:", e);
      setCalendarEvents(EMPTY);
      hydratedRef.current = true;
    }
  }, [userId, setCalendarEvents]);

  // calendarEvents 변경 시 localStorage 저장
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (!hydratedRef.current) return;

    try {
      const keyUserId = userId || "guest";
      const storageKey = `calendar_events:${keyUserId}`;
      localStorage.setItem(storageKey, JSON.stringify(calendarEvents));
    } catch (e) {
      console.error("[ScheduleContext] 캘린더 이벤트 저장 실패:", e);
    }
  }, [calendarEvents, userId]);

  return {
    hydratedRef, // 혹시 Provider에서 hydrate 완료 여부 쓰고 싶을 때 대비
  };
}
