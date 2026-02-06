import { createContext, useContext, useState, useEffect, useRef } from "react";
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
    const [calendarEvents, setCalendarEvents] = useState(() => {
        // 초기 로드 시 localStorage에서 복원
        try {
            const storageKey = getStorageKey();
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed;
            }
        } catch (e) {
            console.error('캘린더 이벤트 복원 실패:', e);
        }
        return { personal: {} };
    });
    
    // 현재 활성화된 캘린더 ID (null이면 개인 캘린더, 문자열이면 팀 캘린더)
    const [activeCalendarId, setActiveCalendarId] = useState(null);
    
    // localStorage에 저장하는 ref (무한 루프 방지)
    const isInitialMount = useRef(true);
    const hydratedRef = useRef(false);
    const migratedGuestToUserRef = useRef(false);
    
    // userId 변경 시 이벤트 복원 및 guest -> user 마이그레이션
    useEffect(() => {
        if (hydratedRef.current) return;
        
        try {
            const userId = user?.id || localStorage.getItem('userId');
            const userStorageKey = userId ? `calendar_events:${userId}` : null;
            const guestStorageKey = 'calendar_events:guest';
            
            // 로그인한 사용자의 경우 guest에서 마이그레이션
            if (userId && !migratedGuestToUserRef.current) {
                const userRaw = userStorageKey ? localStorage.getItem(userStorageKey) : null;
                const guestRaw = localStorage.getItem(guestStorageKey);
                
                if ((!userRaw || userRaw === '{}' || userRaw === '{"personal":{}}') && guestRaw && guestRaw !== '{}' && guestRaw !== '{"personal":{}}') {
                    // guest 데이터를 user로 복사
                    localStorage.setItem(userStorageKey, guestRaw);
                    const parsed = JSON.parse(guestRaw);
                    setCalendarEvents(parsed);
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
                    setCalendarEvents(parsed);
                }
            } else {
                // guest 데이터 복원
                const saved = localStorage.getItem(guestStorageKey);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    setCalendarEvents(parsed);
                }
            }
            
            hydratedRef.current = true;
        } catch (e) {
            console.error('캘린더 이벤트 복원 실패:', e);
            hydratedRef.current = true;
        }
    }, [user?.id]);
    
    // calendarEvents가 변경될 때마다 localStorage에 저장
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        
        if (!hydratedRef.current) return; // 복원 전에는 저장하지 않음
        
        try {
            const userId = user?.id || localStorage.getItem('userId') || 'guest';
            const storageKey = `calendar_events:${userId}`;
            localStorage.setItem(storageKey, JSON.stringify(calendarEvents));
        } catch (e) {
            console.error('캘린더 이벤트 저장 실패:', e);
        }
    }, [calendarEvents, user?.id]);
    
    // 현재 캘린더의 events 가져오기
    const getCurrentEvents = () => {
        const calendarKey = activeCalendarId === null ? 'personal' : `team-${activeCalendarId}`;
        return calendarEvents[calendarKey] || {};
    };
    
    // 일정 추가
    const addEvent = (date, event) => {
        const calendarKey = activeCalendarId === null ? 'personal' : `team-${activeCalendarId}`;
        setCalendarEvents(prev => ({
            ...prev,
            [calendarKey]: {
                ...(prev[calendarKey] || {}),
                [date]: [...((prev[calendarKey] || {})[date] || []), event],
            },
        }));
    };
    
    // 범위 이벤트 일괄 삭제 및 추가 (수정 시 사용)
    const replaceRangeEvent = (oldRangeId, newEvents, oldPostId = null) => {
        const calendarKey = activeCalendarId === null ? 'personal' : `team-${activeCalendarId}`;
        setCalendarEvents(prev => {
            const currentEvents = prev[calendarKey] || {};
            const newEventsObj = { ...currentEvents };
            
            // 기존 이벤트 삭제
            Object.keys(newEventsObj).forEach(dateKey => {
                newEventsObj[dateKey] = (newEventsObj[dateKey] || []).filter(ev => {
                    // rangeId로 삭제 (범위 이벤트인 경우)
                    if (oldRangeId && ev.isRangeEvent && ev.rangeId === oldRangeId) {
                        return false;
                    }
                    // postId로 삭제 (드래그로 만든 이벤트인 경우, rangeId가 없을 때)
                    if (oldPostId && ev.postId === oldPostId && !ev.isRangeEvent) {
                        return false;
                    }
                    return true;
                });
                if (newEventsObj[dateKey].length === 0) {
                    delete newEventsObj[dateKey];
                }
            });
            
            // 새 이벤트 추가
            newEvents.forEach(({ dateKey, event }) => {
                if (!newEventsObj[dateKey]) {
                    newEventsObj[dateKey] = [];
                }
                newEventsObj[dateKey].push(event);
            });
            
            return {
                ...prev,
                [calendarKey]: newEventsObj,
            };
        });
    };

    // 일정 수정
    const updateEvent = (oldDate, eventId, updatedEvent) => {
        const calendarKey = activeCalendarId === null ? 'personal' : `team-${activeCalendarId}`;
        setCalendarEvents(prev => {
            const currentEvents = prev[calendarKey] || {};
            const oldList = currentEvents[oldDate] || [];

            const targetEvent = oldList.find(ev => ev.id === eventId);
            if (!targetEvent) return prev;

            const newDate = updatedEvent.date;

            //날짜가 안 바뀐 경우
            if (oldDate === newDate) {
                return {
                    ...prev,
                    [calendarKey]: {
                        ...currentEvents,
                        [oldDate]: oldList.map(ev =>
                            ev.id === eventId ? { ...ev, ...updatedEvent } : ev
                        ),
                    },
                };
            }

            // 날짜가 바뀐 경우 → 이동
            return {
                ...prev,
                [calendarKey]: {
                    ...currentEvents,
                    [oldDate]: oldList.filter(ev => ev.id !== eventId),
                    [newDate]: [
                        ...(currentEvents[newDate] || []),
                        { ...targetEvent, ...updatedEvent },
                    ],
                },
            };
        });
    };

    // 일정 삭제
    const deleteEvent = (date, eventId) => {
        const calendarKey = activeCalendarId === null ? 'personal' : `team-${activeCalendarId}`;
        setCalendarEvents(prev => {
            const currentEvents = prev[calendarKey] || {};
            const targetEvent = currentEvents[date]?.find(ev => ev.id === eventId);
            
            // 범위 이벤트인 경우 같은 rangeId를 가진 모든 이벤트 삭제
            if (targetEvent?.isRangeEvent && targetEvent?.rangeId) {
                const rangeId = targetEvent.rangeId;
                const newEvents = { ...currentEvents };
                
                // 모든 날짜에서 같은 rangeId를 가진 이벤트 삭제
                Object.keys(newEvents).forEach(dateKey => {
                    newEvents[dateKey] = (newEvents[dateKey] || []).filter(
                        ev => !(ev.isRangeEvent && ev.rangeId === rangeId)
                    );
                    // 빈 배열이면 키 제거
                    if (newEvents[dateKey].length === 0) {
                        delete newEvents[dateKey];
                    }
                });
                
                return {
                    ...prev,
                    [calendarKey]: newEvents,
                };
            }
            
            // 일반 이벤트는 하나만 삭제
            return {
                ...prev,
                [calendarKey]: {
                    ...currentEvents,
                    [date]: ((currentEvents[date] || []).filter(ev => ev.id !== eventId)),
                },
            };
        });
    };

    // 팀 캘린더 초기화 (빈 events로 시작)
    const initializeTeamCalendar = (teamId) => {
        const calendarKey = `team-${teamId}`;
        setCalendarEvents(prev => {
            if (prev[calendarKey]) {
                // 이미 존재하면 초기화하지 않음
                return prev;
            }
            return {
                ...prev,
                [calendarKey]: {},
            };
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
            replaceRangeEvent,
            }}>
        {children}
        </CalendarContext.Provider>
    );
}

export const useCalendar = () => useContext(CalendarContext);
