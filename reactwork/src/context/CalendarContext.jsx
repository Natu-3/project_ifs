import { createContext, useContext, useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "./AuthContext";
import { createSchedule, updateSchedule, deleteSchedule } from "../api/scheduleApi";
import { getMonthSchedules } from "../api/scheduleApi";

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
    const migratedGuestToUserRef = useRef(false);

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
    
    const EVENT_COLORS = ["#FF5733", "#33FF57", "#3357FF", "#F333FF", "#33FFF5", "#FF6B6B"];

    // postId로 색상 가져오기 (메모 드래그 일정용)
    const getEventColor = (postId) => {
        const n = Number(postId);
        if (!Number.isFinite(n)) return EVENT_COLORS[0];
        return EVENT_COLORS[Math.abs(n) % EVENT_COLORS.length];
    };

    // 일정 객체(메모/직접추가 모두)를 위한 단일 색상 규칙
    // - memo 드래그 일정: postId 기반
    // - 캘린더에서 직접 추가한 일정: calendarId -> id 순으로 안정적인 색상 결정
    const getScheduleColor = (event) => {
        if (!event) return EVENT_COLORS[0];
        if (event.postId != null) return getEventColor(event.postId);

        const seed = event.calendarId ?? event.id;
        const n = Number(seed);
        if (!Number.isFinite(n)) return EVENT_COLORS[0];
        return EVENT_COLORS[Math.abs(n) % EVENT_COLORS.length];
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
    const addEvent = async (date, event) => {
        const key = activeCalendarId === null ? "personal" : `team-${activeCalendarId}`;

        try {
    // 이미 DB에서 받은 ID가 있으면 그냥 로컬 저장만
    if (event.id && typeof event.id === 'number' && event.id > 1000000) {
      // DB에서 받은 ID (큰 숫자)면 그냥 로컬 상태 업데이트
      setCalendarEvents(prev => ({
        ...prev,
        [key]: {
          ...(prev[key] || {}),
          [date]: [...((prev[key] || {})[date] || []), event],
        },
      }));
      return;
    }

    // DB에 저장되지 않은 새 이벤트면 DB에 먼저 저장
    const scheduleData = {
      title: event.title,
      content: event.content || "",
      startAt: event.startAt || `${date}T00:00:00`,
      endAt: event.endAt || `${date}T23:59:59`,
    };

    const response = await createSchedule(scheduleData);
    
    // DB 응답으로 로컬 상태 업데이트
    setCalendarEvents(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        [date]: [...((prev[key] || {})[date] || []), {
          ...event,
          id: response.data.id,  // DB ID로 교체
        }],
      },
    }));

    } catch (error) {
        console.error("일정 추가 실패:", error);
        alert("일정 추가에 실패했습니다.");
    }
    };

    //월별 스캐줄 로딩 함수
    const loadMonthSchedules = async (year, month) => {
        try {
            const res = await getMonthSchedules(year, month);

            const mappedEvents = {};

            (res.data || []).forEach((s) => {
            if (!s.startAt) return;

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

            const key =
            activeCalendarId === null
                ? "personal"
                : `team-${activeCalendarId}`;

            setCalendarEvents((prev) => ({
            ...prev,
            [key]: mappedEvents,
            }));
        } catch (e) {
            console.error("월 일정 조회 실패:", e);
        }
    };

    // 범위 이벤트 교체
    const replaceRangeEvent = async (oldRangeId, newEvents, oldPostId = null) => {
        const key = activeCalendarId === null ? "personal" : `team-${activeCalendarId}`;
        
        try {
            // 기존 이벤트들 찾기
            const existingEvents = [];
            const current = getCurrentEvents();
            Object.keys(current).forEach(dateKey => {
                (current[dateKey] || []).forEach(ev => {
                    if (oldRangeId && ev.isRangeEvent && ev.rangeId === oldRangeId) {
                        existingEvents.push(ev);
                    }
                });
            });

            // 기존 이벤트들 DB에서 삭제
            for (const event of existingEvents) {
                if (event.id) {
                    try {
                        await deleteSchedule(event.id);
                    } catch (error) {
                        console.warn("기존 이벤트 삭제 중 오류:", error);
                    }
                }
            }

            // 새 이벤트들 DB에 생성
            const createdEvents = [];
            for (const { dateKey, event } of newEvents) {
                try {
                    const scheduleData = {
                        title: event.title,
                        content: event.content || "",
                        startAt: event.startAt || `${dateKey}T00:00:00`,
                        endAt: event.endAt || `${dateKey}T23:59:59`,
                    };
                    const response = await createSchedule(scheduleData);
                    
                    createdEvents.push({
                        dateKey,
                        event: {
                            ...event,
                            id: response.data.id,  // DB ID로 교체
                        },
                    });
                } catch (error) {
                    console.warn("새 이벤트 생성 중 오류:", error);
                    // 실패해도 계속 진행
                    createdEvents.push({ dateKey, event });
                }
            }

            // 로컬 상태 업데이트
            setCalendarEvents(prev => {
                const updated = { ...prev };
                const calendarData = prev[key] || {};
                const newCalendarData = { ...calendarData };

                // 기존 이벤트 삭제
                Object.keys(newCalendarData).forEach(dateKey => {
                    newCalendarData[dateKey] = (newCalendarData[dateKey] || []).filter(ev => {
                        if (oldRangeId && ev.isRangeEvent && ev.rangeId === oldRangeId) return false;
                        if (oldPostId && ev.postId === oldPostId && !ev.isRangeEvent) return false;
                        return true;
                    });
                    if (newCalendarData[dateKey].length === 0) delete newCalendarData[dateKey];
                });

                // 새 이벤트 추가
                createdEvents.forEach(({ dateKey, event }) => {
                    if (!newCalendarData[dateKey]) newCalendarData[dateKey] = [];
                    newCalendarData[dateKey].push(event);
                });

                return { ...updated, [key]: newCalendarData };
            });
        } catch (error) {
            console.error("범위 이벤트 교체 실패:", error);
            alert("범위 이벤트 수정에 실패했습니다.");
        }
    };

    // 이벤트 수정
    const updateEvent = async (oldDate, eventId, updatedEvent) => {
        const key = activeCalendarId === null ? "personal" : `team-${activeCalendarId}`;
        
        try {
            // DB에 먼저 저장
            const scheduleData = {
                title: updatedEvent.title,
                content: updatedEvent.content || "",
                startAt: updatedEvent.startAt || `${updatedEvent.date}T00:00:00`,
                endAt: updatedEvent.endAt || `${updatedEvent.date}T23:59:59`,
            };
            
            await updateSchedule(eventId, scheduleData);
            
            // DB 저장 성공 후 로컬 상태 업데이트
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
        } catch (error) {
            console.error("일정 수정 실패:", error);
            alert("일정 수정에 실패했습니다.");
        }
    };

    // 이벤트 삭제
    const deleteEvent = async (date, eventId) => {
        const key = activeCalendarId === null ? "personal" : `team-${activeCalendarId}`;
        
        try {
            // DB에서 먼저 삭제
            await deleteSchedule(eventId);
            
            // DB 삭제 성공 후 로컬 상태 업데이트
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
        } catch (error) {
            console.error("일정 삭제 실패:", error);
            alert("일정 삭제에 실패했습니다.");
        }
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
            loadMonthSchedules,
            initializeTeamCalendar,
            removeTeamCalendar,
            deleteEventsByPostId,
            replaceRangeEvent,
            getPersonalEvents,
            getEventColor,
            getScheduleColor,
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
