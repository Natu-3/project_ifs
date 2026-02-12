import { createContext, useContext, useState, useEffect, useRef, useMemo,useCallback } from "react";
import {
    getMonthSchedules,
    getTeamMonthSchedules,
    createSchedule,
    createTeamSchedule,
    updateSchedule as updateScheduleApi,
    updateTeamSchedule,
    deleteSchedule as deleteScheduleApi,
    deleteTeamSchedule,
} from "../api/scheduleApi";
import { useAuth } from "./AuthContext";
import { useCalendar } from "./CalendarContext";

const ScheduleContext = createContext();

export function ScheduleProvider({ children }) {
    const { user } = useAuth();
    const { activeCalendarId } = useCalendar();
    
    // // localStorage 키 생성
    // const getStorageKey = (userId = null) => {
    //     const id = userId || user?.id || localStorage.getItem('userId') || 'guest';
    //     return `calendar_events:${id}`;
    // };
    
    // 캘린더별 일정 저장: { personal: {...}, 'team-1': {...}, 'team-2': {...} }
    const [calendarEvents, setCalendarEvents] = useState({ personal: {} });
    
    // 서버에서 가져온 스케줄 데이터 (월별 조회)
    const [serverEvents, setServerEvents] = useState({});
    const [isScheduleLoading, setIsScheduleLoading] = useState(false);
    
    // refs
    const isInitialMount = useRef(true);
    const hydratedRef = useRef(false);
    const migratedGuestToUserRef = useRef(false);

    // 로그인/로그아웃 감지 → 초기화 / 복원
    useEffect(() => {
        if (!user?.id) {
            // 로그아웃 → 캘린더 초기화
            setCalendarEvents({ personal: {} });
            hydratedRef.current = false;
            return;
        }

        // 로그인 → localStorage 복원
        try {
            const userId = user?.id; //|| localStorage.getItem('userId');
            const userStorageKey = userId ? `calendar_events:${userId}` : null;
            const guestStorageKey = 'calendar_events:guest';
            
            // 로그인한 사용자의 경우 guest에서 마이그레이션
            if (userId && !migratedGuestToUserRef.current) {
                const userRaw = userStorageKey ? localStorage.getItem(userStorageKey) : null;
                const guestRaw = localStorage.getItem(guestStorageKey);
                
                if ((!userRaw || userRaw === '{}' || userRaw === '{"personal":{}}') && guestRaw && guestRaw !== '{}' && guestRaw !== '{"personal":{}}') {
                    localStorage.setItem(userStorageKey, guestRaw);
                    const parsed = JSON.parse(guestRaw);
                    if (parsed && typeof parsed === 'object') {
                        setCalendarEvents(parsed);
                    }
                    migratedGuestToUserRef.current = true;
                    hydratedRef.current = true;
                    return;
                }
                migratedGuestToUserRef.current = true;
            }
            
            // user 데이터 복원
            if (userStorageKey) {
                const saved = localStorage.getItem(userStorageKey);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (parsed && typeof parsed === 'object') {
                        setCalendarEvents(parsed);
                    } else {
                        setCalendarEvents({ personal: {} });
                    }
                } else {
                    setCalendarEvents({ personal: {} });
                }
            } else {
                const saved = localStorage.getItem(guestStorageKey);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (parsed && typeof parsed === 'object') {
                        setCalendarEvents(parsed);
                    } else {
                        setCalendarEvents({ personal: {} });
                    }
                } else {
                    setCalendarEvents({ personal: {} });
                }
            }

            hydratedRef.current = true;
        } catch (e) {
            console.error('[ScheduleContext] 캘린더 이벤트 복원 실패:', e);
            setCalendarEvents({ personal: {} });
            hydratedRef.current = true;
        }
    }, [user?.id]);

    // calendarEvents 변경 시 localStorage 저장
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        if (!hydratedRef.current) return;

        try {
            const userId = user?.id || 'guest';
            const storageKey = `calendar_events:${userId}`;
            const dataToSave = JSON.stringify(calendarEvents);
            localStorage.setItem(storageKey, dataToSave);
        } catch (e) {
            console.error('[ScheduleContext] 캘린더 이벤트 저장 실패:', e);
        }
    }, [calendarEvents, user?.id]);

     const getCalendarStorageKey = useCallback((calendarId = activeCalendarId) => {
        return calendarId === null ? "personal" : `team-${calendarId}`;
    }, [activeCalendarId]);


    // 현재 활성 캘린더 이벤트 가져오기
    const getCurrentEvents = () => {
        const key = getCalendarStorageKey();
        return calendarEvents[key] || {};
    };
    
    // 개인 캘린더의 events 가져오기 (MiniCalendar용)
    const getPersonalEvents = () => {
        return calendarEvents.personal || {};
    };

    // MiniCalendar에서 사용할 월 기준 병합 이벤트
    const getPersonalEventsForMonth = useCallback((year, month) => {
        const personalEvents = calendarEvents.personal || {};
        const monthServerEvents = serverEvents[`personal:${year}-${month}`] || {};
        const merged = { ...personalEvents };

        Object.keys(monthServerEvents).forEach((dateKey) => {
            const localItems = personalEvents[dateKey] || [];
            const serverItems = monthServerEvents[dateKey] || [];
            const localOnly = localItems.filter((ev) => !serverItems.some((sv) => sv.id === ev.id));
            merged[dateKey] = [...serverItems, ...localOnly];
        });

        return merged;
    }, [calendarEvents.personal, serverEvents]);


    // 월별 스케줄 조회 (서버)
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
                version: schedule.version ?? 0,
            },
        }));
    }, []);


    // 월별 스케줄 조회 (서버)
    const fetchSchedules = useCallback(async (year, month, calendarId = activeCalendarId) => {
        const calendarKey = getCalendarStorageKey(calendarId);
        const monthKey = `${calendarKey}:${year}-${month}`;

        setIsScheduleLoading(true);
        try {
            const res = calendarKey === "personal"
                ? await getMonthSchedules(year, month)
                : await getTeamMonthSchedules(calendarId, year, month);
            const mappedEvents = {};

            res.data.forEach((s) => {
                mapScheduleToDateEvents(s).forEach(({ dateKey, event }) => {
                    if (!mappedEvents[dateKey]) {
                        mappedEvents[dateKey] = [];
                    }
                    mappedEvents[dateKey].push(event);
                });
            });

            setServerEvents((prev) => ({
                ...prev,
                 [monthKey]: mappedEvents,
            }));
            return mappedEvents;
        } finally {
            setIsScheduleLoading(false);
        }
      }, [activeCalendarId, getCalendarStorageKey, mapScheduleToDateEvents]);

    // 특정 년/월의 스케줄 가져오기
    const getSchedulesForMonth = useCallback((year, month, calendarId = activeCalendarId) => {
        const key = `${getCalendarStorageKey(calendarId)}:${year}-${month}`;
        return serverEvents[key] || {};
      }, [activeCalendarId, getCalendarStorageKey, serverEvents]);

    // 스케줄 색상 계산
    // 중요도별 색상 (MemoCreatePopup의 PRIORITY_COLORS와 동일)
    const PRIORITY_COLORS = {
        0: "#FF3B30",   // 긴급 - 빨간색
        1: "#FF9500",   // 높음 - 주황색
        2: "#2383e2",   // 보통 - 파란색
        3: "#4CAF50",   // 낮음 - 초록색
        4: "#8E8E93"    // 없음 - 회색
    };

    const EVENT_COLORS = ["#FF5733", "#33FF57", "#3357FF", "#F333FF", "#33FFF5", "#FF6B6B"];

    const getEventColor = (postId) => {
        const n = Number(postId);
        if (!Number.isFinite(n)) return EVENT_COLORS[0];
        return EVENT_COLORS[Math.abs(n) % EVENT_COLORS.length];
    };

    const getScheduleColor = (event, posts = []) => {
        if (!event) return PRIORITY_COLORS[2]; // 기본값: 보통
        
        // 이벤트 자체에 priority가 있으면 우선 사용 (메모가 삭제되어도 유지)
        if (event.priority !== null && event.priority !== undefined) {
            return PRIORITY_COLORS[event.priority] || PRIORITY_COLORS[2];
        }
        
        // postId가 있고 메모가 존재하면 메모의 priority 확인
        if (event.postId != null) {
            const post = posts.find(p => p.id === event.postId);
            if (post?.priority !== null && post?.priority !== undefined) {
                // 메모의 priority 사용 (메모가 존재할 때만)
                return PRIORITY_COLORS[post.priority] || PRIORITY_COLORS[2];
            }
            // 메모가 삭제되었거나 priority가 없는 경우 기존 방식 사용 (하위 호환성)
            return getEventColor(event.postId);
        }

        // 직접 추가한 일정의 경우 기본 색상 (보통)
        return PRIORITY_COLORS[2];
    };

    // 일정 추가
    const addEvent = (date, event) => {
        const key = activeCalendarId === null ? "personal" : `team-${activeCalendarId}`;
        setCalendarEvents(prev => ({
            ...prev,
            [key]: {
                ...(prev[key] || {}),
                [date]: [...((prev[key] || {})[date] || []), event],
            },
        }));
    };

    // 범위 이벤트 교체
    const replaceRangeEvent = (oldRangeId, newEvents, oldPostId = null) => {
        const key = activeCalendarId === null ? "personal" : `team-${activeCalendarId}`;
        setCalendarEvents(prev => {
            const current = prev[key] || {};
            const updated = { ...current };

            Object.keys(updated).forEach(dateKey => {
                updated[dateKey] = (updated[dateKey] || []).filter(ev => {
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
    };

    // 이벤트 수정
    const updateEvent = (oldDate, eventId, updatedEvent) => {
        const key = activeCalendarId === null ? "personal" : `team-${activeCalendarId}`;
        setCalendarEvents(prev => {
            const current = prev[key] || {};
            const oldList = current[oldDate] || [];
            const target = oldList.find(ev => ev.id === eventId);
            if (!target) return prev;

            const newDate = updatedEvent.date;
            if (oldDate === newDate) {
                return {
                    ...prev,
                    [key]: {
                        ...current,
                        [oldDate]: oldList.map(ev => (ev.id === eventId ? { ...ev, ...updatedEvent } : ev)),
                    },
                };
            }

            return {
                ...prev,
                [key]: {
                    ...current,
                    [oldDate]: oldList.filter(ev => ev.id !== eventId),
                    [newDate]: [...(current[newDate] || []), { ...target, ...updatedEvent }],
                },
            };
        });
    };

    // 이벤트 삭제
    const deleteEvent = (date, eventId) => {
        const key = activeCalendarId === null ? "personal" : `team-${activeCalendarId}`;
        setCalendarEvents(prev => {
            const current = prev[key] || {};
            const target = current[date]?.find(ev => ev.id === eventId);

            if (target?.isRangeEvent && target?.rangeId) {
                const rangeId = target.rangeId;
                const updated = { ...current };
                Object.keys(updated).forEach(dateKey => {
                    updated[dateKey] = (updated[dateKey] || []).filter(
                        ev => !(ev.isRangeEvent && ev.rangeId === rangeId)
                    );
                    if (updated[dateKey].length === 0) delete updated[dateKey];
                });
                return { ...prev, [key]: updated };
            }

            return {
                ...prev,
                [key]: {
                    ...current,
                    [date]: (current[date] || []).filter(ev => ev.id !== eventId),
                },
            };
        });
    };

    // 팀 캘린더 초기화
    const initializeTeamCalendar = teamId => {
        const key = `team-${teamId}`;
        setCalendarEvents(prev => (prev[key] ? prev : { ...prev, [key]: {} }));
    };
    
    // 팀 캘린더 삭제 (이벤트도 함께 삭제)
    const removeTeamCalendar = (teamId) => {
        const calendarKey = `team-${teamId}`;
        setCalendarEvents(prev => {
            const newEvents = { ...prev };
            delete newEvents[calendarKey];
            return newEvents;
        });
    };
    
    // postId로 연결된 모든 캘린더 이벤트 삭제 (모든 캘린더에서)
    const deleteEventsByPostId = (postId) => {
        if (!postId) return;
        
        setCalendarEvents(prev => {
            const newEvents = {};
            
            Object.keys(prev).forEach(calendarKey => {
                const calendarEvents = prev[calendarKey] || {};
                const newCalendarEvents = {};
                
                Object.keys(calendarEvents).forEach(dateKey => {
                    const events = calendarEvents[dateKey] || [];
                    const filteredEvents = events.filter(ev => ev.postId !== postId);
                    
                    if (filteredEvents.length > 0) {
                        newCalendarEvents[dateKey] = filteredEvents;
                    }
                });
                
                if (Object.keys(newCalendarEvents).length > 0) {
                    newEvents[calendarKey] = newCalendarEvents;
                } else if (calendarKey === 'personal') {
                    newEvents[calendarKey] = {};
                }
            });
            
            if (!newEvents.personal) {
                newEvents.personal = {};
            }
            
            return newEvents;
        });
    };

    const createEvent = async ({ title, content, startDate, endDate, postId = null, priority = 2 }) => {
        const payload = {
            title,
            content,
            startAt: `${startDate}T00:00:00`,
            endAt: `${(endDate || startDate)}T23:59:59`,
            memoId: postId,
            priority,
        };

        if (activeCalendarId === null) {
            const res = await createSchedule(payload);
            return res.data;
        }

        const res = await createTeamSchedule({
            ...payload,
            calendarId: activeCalendarId,
        });
        return res.data;
    };

    const editEvent = async (scheduleId, { title, content, startDate, endDate, postId = null, priority = 2, baseVersion = null }) => {
        const payload = {
            title,
            content,
            startAt: `${startDate}T00:00:00`,
            endAt: `${(endDate || startDate)}T23:59:59`,
            memoId: postId,
            priority,
        };

        if (activeCalendarId === null) {
            const res = await updateScheduleApi(scheduleId, payload);
            return res.data;
        }

        const res = await updateTeamSchedule(scheduleId, {
            ...payload,
            calendarId: activeCalendarId,
            baseVersion,
        });
        return res.data;
    };

    const removeEvent = async (scheduleId, baseVersion = null) => {
         if (activeCalendarId === null) {
            await deleteScheduleApi(scheduleId);
            return;
        }
        await deleteTeamSchedule(scheduleId, activeCalendarId, baseVersion);
    };

    // 모든 캘린더에서 사용된 postId 목록 가져오기 (사이드바 색 표시용)
    const usedPostIds = useMemo(() => {
        const usedPostIdsSet = new Set();
        Object.values(calendarEvents).forEach(events => {
            Object.values(events).forEach(eventList => {
                eventList.forEach(event => {
                    if (event.postId) {
                        usedPostIdsSet.add(event.postId);
                    }
                });
            });
        });
        return usedPostIdsSet;
    }, [calendarEvents]);
    
    const getUsedPostIds = () => {
        return usedPostIds;
    };

    // postId가 어느 캘린더에 연결되어 있는지 확인
    const getPostCalendarInfo = (postId) => {
        if (!postId) return null;
        
        const personalEvents = calendarEvents.personal || {};
        for (const dateKey in personalEvents) {
            if (personalEvents[dateKey].some(ev => ev.postId === postId)) {
                return { type: 'personal', teamId: null };
            }
        }
        
        for (const calendarKey in calendarEvents) {
            if (calendarKey.startsWith('team-')) {
                const teamId = calendarKey.replace('team-', '');
                const teamEvents = calendarEvents[calendarKey] || {};
                for (const dateKey in teamEvents) {
                    if (teamEvents[dateKey].some(ev => ev.postId === postId)) {
                        return { type: 'team', teamId: teamId };
                    }
                }
            }
        }
        
        return null;
    };

    return (
        <ScheduleContext.Provider
            value={{
                // 이벤트 관리
                events: getCurrentEvents(),
                addEvent,
                updateEvent,
                deleteEvent,
                replaceRangeEvent,
                getPersonalEvents,
                getPersonalEventsForMonth,
                setEvents: (events) => {
                    const key = activeCalendarId === null ? "personal" : `team-${activeCalendarId}`;
                    setCalendarEvents(prev => ({
                        ...prev,
                        [key]: events
                    }));
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
            }}
        >
            {children}
        </ScheduleContext.Provider>
    );
}

export const useSchedule = () => useContext(ScheduleContext);
