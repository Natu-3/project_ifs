import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
} from "react";

import {
  createSchedule,
  updateSchedule as updateScheduleApi,
  deleteSchedule as deleteScheduleApi,
} from "../api/scheduleApi";

import { useAuth } from "./AuthContext";
import { useCalendar } from "./CalendarContext";
import { useSchedulePersistence } from "./schedule/useSchedulePersistence";
import { useScheduleServer } from "./schedule/useScheduleServer";

const ScheduleContext = createContext();

export function ScheduleProvider({ children }) {
  const { user } = useAuth();
  const { activeCalendarId } = useCalendar();

  // 캘린더별 일정 저장: { personal: {...}, 'team-1': {...}, ... }
  const [calendarEvents, setCalendarEvents] = useState({ personal: {} });

  // activeCalendarId -> storage key
  const getCalendarStorageKey = useCallback(
    (calendarId = activeCalendarId) => {
      return calendarId === null ? "personal" : `team-${calendarId}`;
    },
    [activeCalendarId]
  );

  // localStorage hydrate/migrate/save
  useSchedulePersistence({
    userId: user?.id,
    calendarEvents,
    setCalendarEvents,
  });

  // server 월별 조회
  const { serverEvents, isScheduleLoading, fetchSchedules, getSchedulesForMonth } =
    useScheduleServer({ getCalendarStorageKey, activeCalendarId });

  // 현재 활성 캘린더 이벤트 가져오기
  const getCurrentEvents = useCallback(() => {
    const key = getCalendarStorageKey();
    return calendarEvents[key] || {};
  }, [calendarEvents, getCalendarStorageKey]);

  // 개인 캘린더 events (MiniCalendar용)
  const getPersonalEvents = useCallback(() => {
    return calendarEvents.personal || {};
  }, [calendarEvents.personal]);

  // MiniCalendar에서 사용할 월 기준 병합 이벤트
  const getPersonalEventsForMonth = useCallback(
    (year, month) => {
      const personalEvents = calendarEvents.personal || {};
      const monthServerEvents = serverEvents[`personal:${year}-${month}`] || {};
      const merged = { ...personalEvents };

      Object.keys(monthServerEvents).forEach((dateKey) => {
        const localItems = personalEvents[dateKey] || [];
        const serverItems = monthServerEvents[dateKey] || [];
        const localOnly = localItems.filter(
          (ev) => !serverItems.some((sv) => sv.id === ev.id)
        );
        merged[dateKey] = [...serverItems, ...localOnly];
      });

      return merged;
    },
    [calendarEvents.personal, serverEvents]
  );

  // ---- 색상 로직(일단 Provider에 그대로 둠) ----
  const PRIORITY_COLORS = {
    0: "#FF3B30",
    1: "#FF9500",
    2: "#2383e2",
    3: "#4CAF50",
    4: "#8E8E93",
  };
  const EVENT_COLORS = ["#FF5733", "#33FF57", "#3357FF", "#F333FF", "#33FFF5", "#FF6B6B"];

  const getEventColor = useCallback((postId) => {
    const n = Number(postId);
    if (!Number.isFinite(n)) return EVENT_COLORS[0];
    return EVENT_COLORS[Math.abs(n) % EVENT_COLORS.length];
  }, []);

  const getScheduleColor = useCallback(
    (event, posts = []) => {
      if (!event) return PRIORITY_COLORS[2];

      if (event.priority !== null && event.priority !== undefined) {
        return PRIORITY_COLORS[event.priority] || PRIORITY_COLORS[2];
      }

      if (event.postId != null) {
        const post = posts.find((p) => p.id === event.postId);
        if (post?.priority !== null && post?.priority !== undefined) {
          return PRIORITY_COLORS[post.priority] || PRIORITY_COLORS[2];
        }
        return getEventColor(event.postId);
      }

      return PRIORITY_COLORS[2];
    },
    [getEventColor]
  );

  // ---- calendarEvents CRUD(요청대로 Provider에 남김) ----
  const addEvent = useCallback(
    (date, event) => {
      const key = getCalendarStorageKey();
      setCalendarEvents((prev) => ({
        ...prev,
        [key]: {
          ...(prev[key] || {}),
          [date]: [...((prev[key] || {})[date] || []), event],
        },
      }));
    },
    [getCalendarStorageKey]
  );

  const replaceRangeEvent = useCallback(
    (oldRangeId, newEvents, oldPostId = null) => {
      const key = getCalendarStorageKey();
      setCalendarEvents((prev) => {
        const current = prev[key] || {};
        const updated = { ...current };

        Object.keys(updated).forEach((dateKey) => {
          updated[dateKey] = (updated[dateKey] || []).filter((ev) => {
            if (oldRangeId && ev.isRangeEvent && ev.rangeId === oldRangeId) return false;
            if (oldPostId && ev.postId === oldPostId && !ev.isRangeEvent) return false;
            return true;
          });
          if (updated[dateKey].length === 0) delete updated[dateKey];
        });

        newEvents.forEach(({ dateKey, event }) => {
          if (!updated[dateKey]) updated[dateKey] = [];
          updated[dateKey].push(event);
        });

        return { ...prev, [key]: updated };
      });
    },
    [getCalendarStorageKey]
  );

  const updateEvent = useCallback(
    (oldDate, eventId, updatedEvent) => {
      const key = getCalendarStorageKey();
      setCalendarEvents((prev) => {
        const current = prev[key] || {};
        const oldList = current[oldDate] || [];
        const target = oldList.find((ev) => ev.id === eventId);
        if (!target) return prev;

        const newDate = updatedEvent.date;
        if (oldDate === newDate) {
          return {
            ...prev,
            [key]: {
              ...current,
              [oldDate]: oldList.map((ev) =>
                ev.id === eventId ? { ...ev, ...updatedEvent } : ev
              ),
            },
          };
        }

        return {
          ...prev,
          [key]: {
            ...current,
            [oldDate]: oldList.filter((ev) => ev.id !== eventId),
            [newDate]: [...(current[newDate] || []), { ...target, ...updatedEvent }],
          },
        };
      });
    },
    [getCalendarStorageKey]
  );

  const deleteEvent = useCallback(
    (date, eventId) => {
      const key = getCalendarStorageKey();
      setCalendarEvents((prev) => {
        const current = prev[key] || {};
        const target = current[date]?.find((ev) => ev.id === eventId);

        if (target?.isRangeEvent && target?.rangeId) {
          const rangeId = target.rangeId;
          const updated = { ...current };
          Object.keys(updated).forEach((dateKey) => {
            updated[dateKey] = (updated[dateKey] || []).filter(
              (ev) => !(ev.isRangeEvent && ev.rangeId === rangeId)
            );
            if (updated[dateKey].length === 0) delete updated[dateKey];
          });
          return { ...prev, [key]: updated };
        }

        return {
          ...prev,
          [key]: {
            ...current,
            [date]: (current[date] || []).filter((ev) => ev.id !== eventId),
          },
        };
      });
    },
    [getCalendarStorageKey]
  );

  const initializeTeamCalendar = useCallback((teamId) => {
    const key = `team-${teamId}`;
    setCalendarEvents((prev) => (prev[key] ? prev : { ...prev, [key]: {} }));
  }, []);

  const removeTeamCalendar = useCallback((teamId) => {
    const calendarKey = `team-${teamId}`;
    setCalendarEvents((prev) => {
      const next = { ...prev };
      delete next[calendarKey];
      return next;
    });
  }, []);

  const deleteEventsByPostId = useCallback((postId) => {
    if (!postId) return;

    setCalendarEvents((prev) => {
      const newEvents = {};

      Object.keys(prev).forEach((calendarKey) => {
        const ce = prev[calendarKey] || {};
        const nextCalendar = {};

        Object.keys(ce).forEach((dateKey) => {
          const events = ce[dateKey] || [];
          const filtered = events.filter((ev) => ev.postId !== postId);
          if (filtered.length > 0) nextCalendar[dateKey] = filtered;
        });

        if (Object.keys(nextCalendar).length > 0) newEvents[calendarKey] = nextCalendar;
        else if (calendarKey === "personal") newEvents[calendarKey] = {};
      });

      if (!newEvents.personal) newEvents.personal = {};
      return newEvents;
    });
  }, []);

  // 서버 CRUD
  const createEvent = useCallback(async ({ title, content, startDate, endDate, postId = null, priority = 2 }) => {
    const payload = {
      title,
      content,
      startAt: `${startDate}T00:00:00`,
      endAt: `${(endDate || startDate)}T23:59:59`,
      memoId: postId,
      priority,
    };
    const res = await createSchedule(payload);
    return res.data;
  }, []);

  const editEvent = useCallback(async (scheduleId, { title, content, startDate, endDate, postId = null, priority = 2 }) => {
    const payload = {
      title,
      content,
      startAt: `${startDate}T00:00:00`,
      endAt: `${(endDate || startDate)}T23:59:59`,
      memoId: postId,
      priority,
    };
    const res = await updateScheduleApi(scheduleId, payload);
    return res.data;
  }, []);

  const removeEvent = useCallback(async (scheduleId) => {
    await deleteScheduleApi(scheduleId);
  }, []);

  // usedPostIds / info
  const usedPostIds = useMemo(() => {
    const set = new Set();
    Object.values(calendarEvents).forEach((events) => {
      Object.values(events).forEach((eventList) => {
        eventList.forEach((event) => {
          if (event.postId) set.add(event.postId);
        });
      });
    });
    return set;
  }, [calendarEvents]);

  const getUsedPostIds = useCallback(() => usedPostIds, [usedPostIds]);

  const getPostCalendarInfo = useCallback(
    (postId) => {
      if (!postId) return null;

      const personalEvents = calendarEvents.personal || {};
      for (const dateKey in personalEvents) {
        if (personalEvents[dateKey].some((ev) => ev.postId === postId)) {
          return { type: "personal", teamId: null };
        }
      }

      for (const calendarKey in calendarEvents) {
        if (calendarKey.startsWith("team-")) {
          const teamId = calendarKey.replace("team-", "");
          const teamEvents = calendarEvents[calendarKey] || {};
          for (const dateKey in teamEvents) {
            if (teamEvents[dateKey].some((ev) => ev.postId === postId)) {
              return { type: "team", teamId };
            }
          }
        }
      }

      return null;
    },
    [calendarEvents]
  );

  // Provider value는 useMemo로 고정(리렌더 비용 줄임)
  const value = useMemo(
    () => ({
      // 이벤트 관리
      events: getCurrentEvents(),
      addEvent,
      updateEvent,
      deleteEvent,
      replaceRangeEvent,
      getPersonalEvents,
      getPersonalEventsForMonth,
      setEvents: (events) => {
        const key = getCalendarStorageKey();
        setCalendarEvents((prev) => ({ ...prev, [key]: events }));
      },

      // 서버 스케줄
      serverEvents,
      fetchSchedules,
      getSchedulesForMonth,
      isScheduleLoading,
      createEvent,
      editEvent,
      removeEvent,

      // 색상 계산
      getScheduleColor,
      getEventColor,

      // 팀 캘린더 관리
      initializeTeamCalendar,
      removeTeamCalendar,
      deleteEventsByPostId,

      // 기타
      getUsedPostIds,
      getPostCalendarInfo,
      usedPostIds,
    }),
    [
      getCurrentEvents,
      addEvent,
      updateEvent,
      deleteEvent,
      replaceRangeEvent,
      getPersonalEvents,
      getPersonalEventsForMonth,
      getCalendarStorageKey,
      serverEvents,
      fetchSchedules,
      getSchedulesForMonth,
      isScheduleLoading,
      createEvent,
      editEvent,
      removeEvent,
      getScheduleColor,
      getEventColor,
      initializeTeamCalendar,
      removeTeamCalendar,
      deleteEventsByPostId,
      getUsedPostIds,
      getPostCalendarInfo,
      usedPostIds,
    ]
  );

  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>;
}

export const useSchedule = () => useContext(ScheduleContext);
