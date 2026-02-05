import { createContext, useContext, useState } from "react";

const CalendarContext = createContext();

export function CalendarProvider({ children }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    
    // 캘린더별 일정 저장: { personal: {...}, 'team-1': {...}, 'team-2': {...} }
    const [calendarEvents, setCalendarEvents] = useState({
        personal: {},
    });
    
    // 현재 활성화된 캘린더 ID (null이면 개인 캘린더, 문자열이면 팀 캘린더)
    const [activeCalendarId, setActiveCalendarId] = useState(null);
    
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
        setCalendarEvents(prev => ({
            ...prev,
            [calendarKey]: {
                ...(prev[calendarKey] || {}),
                [date]: ((prev[calendarKey] || {})[date] || []).filter(ev => ev.id !== eventId),
            },
        }));
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
            }}>
        {children}
        </CalendarContext.Provider>
    );
}

export const useCalendar = () => useContext(CalendarContext);
