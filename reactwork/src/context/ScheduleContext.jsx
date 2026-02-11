import { createContext, useContext, useState, useEffect, useRef, useMemo } from "react";
import { getMonthSchedules } from "../api/scheduleApi";
import { useAuth } from "./AuthContext";
import { useCalendar } from "./CalendarContext";

const ScheduleContext = createContext();

export function ScheduleProvider({ children }) {
    const { user } = useAuth();
    const { activeCalendarId } = useCalendar();
    
    // localStorage 키 생성
    const getStorageKey = (userId = null) => {
        const id = userId || user?.id || localStorage.getItem('userId') || 'guest';
        return `calendar_events:${id}`;
    };
    
    // 캘린더별 일정 저장: { personal: {...}, 'team-1': {...}, 'team-2': {...} }
    const [calendarEvents, setCalendarEvents] = useState({ personal: {} });
    
    // 서버에서 가져온 스케줄 데이터 (월별 조회)
    const [serverEvents, setServerEvents] = useState({});
    
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
            const userId = user?.id || localStorage.getItem('userId');
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
            const userId = user?.id || localStorage.getItem('userId') || 'guest';
            const storageKey = `calendar_events:${userId}`;
            const dataToSave = JSON.stringify(calendarEvents);
            localStorage.setItem(storageKey, dataToSave);
        } catch (e) {
            console.error('[ScheduleContext] 캘린더 이벤트 저장 실패:', e);
        }
    }, [calendarEvents, user?.id]);

    // 현재 활성 캘린더 이벤트 가져오기
    const getCurrentEvents = () => {
        const key = activeCalendarId === null ? "personal" : `team-${activeCalendarId}`;
        return calendarEvents[key] || {};
    };
    
    // 개인 캘린더의 events 가져오기 (MiniCalendar용)
    const getPersonalEvents = () => {
        return calendarEvents.personal || {};
    };

    // 월별 스케줄 조회 (서버)
    const fetchSchedules = async (year, month) => {
        try {
            const res = await getMonthSchedules(year, month);
            const mappedEvents = {};

            res.data.forEach(s => {
                const dateKey = s.startAt.slice(0, 10);

                if (!mappedEvents[dateKey]) {
                    mappedEvents[dateKey] = [];
                }

                mappedEvents[dateKey].push({
                    id: s.id,
                    title: s.title,
                    content: s.content,
                    startAt: s.startAt,
                    endAt: s.endAt,
                    ownerId: s.ownerId,
                    calendarId: s.calendarId,
                });
            });

            setServerEvents(prev => ({
                ...prev,
                [`${year}-${month}`]: mappedEvents
            }));
        } catch (e) {
            console.error("월 스캐줄 조회 실패", e);
        }
    };

    // 특정 년/월의 스케줄 가져오기
    const getSchedulesForMonth = (year, month) => {
        const key = `${year}-${month}`;
        return serverEvents[key] || {};
    };

    // 스케줄 색상 계산
    const EVENT_COLORS = ["#FF5733", "#33FF57", "#3357FF", "#F333FF", "#33FFF5", "#FF6B6B"];

    const getEventColor = (postId) => {
        const n = Number(postId);
        if (!Number.isFinite(n)) return EVENT_COLORS[0];
        return EVENT_COLORS[Math.abs(n) % EVENT_COLORS.length];
    };

    const getScheduleColor = (event) => {
        if (!event) return EVENT_COLORS[0];
        if (event.postId != null) return getEventColor(event.postId);

        const seed = event.calendarId ?? event.id;
        const n = Number(seed);
        if (!Number.isFinite(n)) return EVENT_COLORS[0];
        return EVENT_COLORS[Math.abs(n) % EVENT_COLORS.length];
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
