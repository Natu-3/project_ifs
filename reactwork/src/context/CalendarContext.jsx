import { createContext, useContext, useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";

const CalendarContext = createContext();

export function CalendarProvider({ children }) {
    const { user } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());

    // 현재 활성화된 캘린더 ID (null이면 개인, 문자열이면 팀)
    const [activeCalendarId, setActiveCalendarId] = useState(null);

    // 캘린더 이벤트 상태: { personal: {...}, 'team-1': {...}, ... }
    const [calendarEvents, setCalendarEvents] = useState({ personal: {} });

    // refs
    const isInitialMount = useRef(true);
    const hydratedRef = useRef(false);

    // 로그아웃 시 강제 초기화
    const resetCalendar = () => {
        setCalendarEvents({ personal: {} });
        setActiveCalendarId(null);
        hydratedRef.current = false;
    };

    // 로그인/로그아웃 감지 → 초기화 / 복원
    useEffect(() => {
        if (!user?.id) {
            // 로그아웃 → 캘린더 초기화
            resetCalendar();
            return;
        }

        // 로그인 → localStorage 복원
        try {
            const storageKey = `calendar_events:${user.id}`;
            const saved = localStorage.getItem(storageKey);

            if (saved) {
                setCalendarEvents(JSON.parse(saved));
            } else {
                setCalendarEvents({ personal: {} });
            }

            hydratedRef.current = true;
        } catch (e) {
            console.error("캘린더 이벤트 복원 실패:", e);
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
            const storageKey = user?.id
                ? `calendar_events:${user.id}`
                : "calendar_events:guest";
            localStorage.setItem(storageKey, JSON.stringify(calendarEvents));
        } catch (e) {
            console.error("캘린더 이벤트 저장 실패:", e);
        }
    }, [calendarEvents, user?.id]);

    // 현재 활성 캘린더 이벤트 가져오기
    const getCurrentEvents = () => {
        const key = activeCalendarId === null ? "personal" : `team-${activeCalendarId}`;
        return calendarEvents[key] || {};
    };

    // 이벤트 추가
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

    return (
        <CalendarContext.Provider
            value={{
                currentDate,
                setCurrentDate,
                events: getCurrentEvents(),
                addEvent,
                updateEvent,
                deleteEvent,
                setEvents: setCalendarEvents,
                activeCalendarId,
                setActiveCalendarId,
                initializeTeamCalendar,
                replaceRangeEvent,
                resetCalendar,
            }}
        >
            {children}
        </CalendarContext.Provider>
    );
}

export const useCalendar = () => useContext(CalendarContext);
