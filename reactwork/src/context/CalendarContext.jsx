import { createContext, useContext, useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "./AuthContext";

const CalendarContext = createContext();

export function CalendarProvider({ children }) {
    const { user } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    
    // localStorage 키 생성
    const getStorageKey = (userId = null) => {
        const id = userId || user?.id || localStorage.getItem('userId') || 'guest';
        return `calendar_events:${id}`;
    };
    
    // 캘린더별 일정 저장: { personal: {...}, 'team-1': {...}, 'team-2': {...} }
    // 초기값은 빈 객체로 설정하고, useEffect에서 복원
    const [calendarEvents, setCalendarEvents] = useState({ personal: {} });
    
    // 현재 활성화된 캘린더 ID (null이면 개인 캘린더, 문자열이면 팀 캘린더)
    const [activeCalendarId, setActiveCalendarId] = useState(null);

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
            const userId = user?.id || localStorage.getItem('userId');
            const userStorageKey = userId ? `calendar_events:${userId}` : null;
            const guestStorageKey = 'calendar_events:guest';
            
            console.log('[CalendarContext] 복원 시작 - userId:', userId, 'userStorageKey:', userStorageKey);
            
            // 로그인한 사용자의 경우 guest에서 마이그레이션
            if (userId && !migratedGuestToUserRef.current) {
                const userRaw = userStorageKey ? localStorage.getItem(userStorageKey) : null;
                const guestRaw = localStorage.getItem(guestStorageKey);
                
                console.log('[CalendarContext] 마이그레이션 체크 - userRaw:', userRaw, 'guestRaw:', guestRaw);
                
                if ((!userRaw || userRaw === '{}' || userRaw === '{"personal":{}}') && guestRaw && guestRaw !== '{}' && guestRaw !== '{"personal":{}}') {
                    // guest 데이터를 user로 복사
                    localStorage.setItem(userStorageKey, guestRaw);
                    const parsed = JSON.parse(guestRaw);
                    if (parsed && typeof parsed === 'object') {
                        console.log('[CalendarContext] guest에서 user로 마이그레이션:', parsed);
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
                console.log('[CalendarContext] user 데이터 복원 시도 - saved:', saved);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (parsed && typeof parsed === 'object') {
                        console.log('[CalendarContext] user 데이터 복원 성공:', parsed);
                        setCalendarEvents(parsed);
                    } else {
                        console.log('[CalendarContext] user 데이터 파싱 실패, 기본값 사용');
                        setCalendarEvents({ personal: {} });
                    }
                } else {
                    console.log('[CalendarContext] user 데이터 없음, 기본값 사용');
                    setCalendarEvents({ personal: {} });
                }
            } else {
                // guest 데이터 복원
                const saved = localStorage.getItem(guestStorageKey);
                console.log('[CalendarContext] guest 데이터 복원 시도 - saved:', saved);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (parsed && typeof parsed === 'object') {
                        console.log('[CalendarContext] guest 데이터 복원 성공:', parsed);
                        setCalendarEvents(parsed);
                    } else {
                        console.log('[CalendarContext] guest 데이터 파싱 실패, 기본값 사용');
                        setCalendarEvents({ personal: {} });
                    }
                } else {
                    console.log('[CalendarContext] guest 데이터 없음, 기본값 사용');
                    setCalendarEvents({ personal: {} });
                }
            }

            hydratedRef.current = true;
        } catch (e) {
            console.error('[CalendarContext] 캘린더 이벤트 복원 실패:', e);
            // 에러 발생 시 기본값 사용
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
            console.log('[CalendarContext] 저장 완료 - storageKey:', storageKey, 'data:', dataToSave);
        } catch (e) {
            console.error('[CalendarContext] 캘린더 이벤트 저장 실패:', e);
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
    
    // postId로 색상 가져오기 (캘린더 이벤트 색상과 동일)
    const getEventColor = (postId) => {
        const colors = ["#FF5733", "#33FF57", "#3357FF", "#F333FF", "#33FFF5", "#FF6B6B"];
        return colors[postId % colors.length];
    };
    
    // 모든 캘린더에서 사용된 postId 목록 가져오기 (사이드바 색 표시용)
    // useMemo로 최적화하여 calendarEvents가 변경될 때만 재계산
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
    
    // postId로 색상 가져오기 (캘린더 이벤트 색상과 동일)
    const getPostColor = (postId) => {
        if (!postId) return null;
        return getEventColor(postId);
    };
    
    // postId가 어느 캘린더에 연결되어 있는지 확인
    const getPostCalendarInfo = (postId) => {
        if (!postId) return null;
        
        // 개인 캘린더 확인
        const personalEvents = calendarEvents.personal || {};
        for (const dateKey in personalEvents) {
            if (personalEvents[dateKey].some(ev => ev.postId === postId)) {
                return { type: 'personal', teamId: null };
            }
        }
        
        // 팀 캘린더 확인
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
            
            // 모든 캘린더(개인 + 팀)를 순회하면서 postId가 있는 이벤트 제거
            Object.keys(prev).forEach(calendarKey => {
                const calendarEvents = prev[calendarKey] || {};
                const newCalendarEvents = {};
                
                Object.keys(calendarEvents).forEach(dateKey => {
                    const events = calendarEvents[dateKey] || [];
                    // postId가 일치하는 이벤트 제외
                    const filteredEvents = events.filter(ev => ev.postId !== postId);
                    
                    // 빈 배열이 아니면 추가
                    if (filteredEvents.length > 0) {
                        newCalendarEvents[dateKey] = filteredEvents;
                    }
                });
                
                // 빈 객체가 아니면 추가 (빈 객체여도 personal은 유지)
                if (Object.keys(newCalendarEvents).length > 0) {
                    newEvents[calendarKey] = newCalendarEvents;
                } else if (calendarKey === 'personal') {
                    // personal 캘린더는 빈 객체라도 유지
                    newEvents[calendarKey] = {};
                }
            });
            
            // 최소한 personal은 있어야 함
            if (!newEvents.personal) {
                newEvents.personal = {};
            }
            
            return newEvents;
        });
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
            activeCalendarId,
            setActiveCalendarId,
            initializeTeamCalendar,
            removeTeamCalendar,
            deleteEventsByPostId,
            replaceRangeEvent,
            getPersonalEvents,
            getEventColor,
            getUsedPostIds,
            getPostColor,
            getPostCalendarInfo,
            usedPostIds,
            }}>
        {children}
        </CalendarContext.Provider>
    );
}

export const useCalendar = () => useContext(CalendarContext);
