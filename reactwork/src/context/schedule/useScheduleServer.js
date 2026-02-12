import { useCallback, useState } from "react";
import { getMonthSchedules } from "../../api/scheduleApi";

// 월별 스케줄 조회 + serverEvents 관리만 담당
export function useScheduleServer({ getCalendarStorageKey, activeCalendarId }) {
  const [serverEvents, setServerEvents] = useState({});
  const [isScheduleLoading, setIsScheduleLoading] = useState(false);

  const mapScheduleToDateEvents = useCallback((schedule) => {
    const start = new Date(schedule.startAt);
    const end = new Date(schedule.endAt || schedule.startAt);
    const dates = [];
    const cursor = new Date(start);

    while (cursor <= end) {
      const y = cursor.getFullYear();
      const m = String(cursor.getMonth() + 1).padStart(2, "0");
      const d = String(cursor.getDate()).padStart(2, "0");
      dates.push(`${y}-${m}-${d}`);
      cursor.setDate(cursor.getDate() + 1);
    }

    return dates.map((dateKey) => ({
      dateKey,
      event: {
        id: schedule.id,
        title: schedule.title,
        content: schedule.content,
        startAt: schedule.startAt,
        endAt: schedule.endAt,
        date: dateKey,
        dateKey,
        startDate: schedule.startAt?.slice(0, 10),
        endDate: schedule.endAt?.slice(0, 10),
        isRangeEvent: dates.length > 1,
        rangeId: schedule.id,
        source: "server",
        postId: schedule.memoId ?? null,
        priority: schedule.priority ?? null,
      },
    }));
  }, []);

  const fetchSchedules = useCallback(
    async (year, month, calendarId = activeCalendarId) => {
      const calendarKey = getCalendarStorageKey(calendarId);
      const monthKey = `${calendarKey}:${year}-${month}`;

      // 너 코드 로직: personal만 서버 조회, 팀은 빈 객체 세팅
      if (calendarKey !== "personal") {
        setServerEvents((prev) => ({ ...prev, [monthKey]: {} }));
        return;
      }

      setIsScheduleLoading(true);
      try {
        const res = await getMonthSchedules(year, month);
        const mappedEvents = {};

        res.data.forEach((s) => {
          mapScheduleToDateEvents(s).forEach(({ dateKey, event }) => {
            if (!mappedEvents[dateKey]) mappedEvents[dateKey] = [];
            mappedEvents[dateKey].push(event);
          });
        });

        setServerEvents((prev) => ({ ...prev, [monthKey]: mappedEvents }));
      } finally {
        setIsScheduleLoading(false);
      }
    },
    [activeCalendarId, getCalendarStorageKey, mapScheduleToDateEvents]
  );

  const getSchedulesForMonth = useCallback(
    (year, month, calendarId = activeCalendarId) => {
      const key = `${getCalendarStorageKey(calendarId)}:${year}-${month}`;
      return serverEvents[key] || {};
    },
    [activeCalendarId, getCalendarStorageKey, serverEvents]
  );

  return {
    serverEvents,
    isScheduleLoading,
    fetchSchedules,
    getSchedulesForMonth,
  };
}
