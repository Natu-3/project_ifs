import { createContext, useContext, useState } from "react";

const CalendarContext = createContext();

export function CalendarProvider({ children }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    
    //날자별 일정 저장
    const [events, setEvents] = useState({});
    
    //일정 추가
    const addEvent = (date, event) => {
        setEvents(prev => ({
            ...prev,
            [date]: [...(prev[date] || []), event],
        }));
    };

    //일정 수정
    const updateEvent = (oldDate, eventId, updatedEvent) => {
        setEvents(prev => {
            const oldList = prev[oldDate] || [];

            const targetEvent = oldList.find(ev => ev.id === eventId);
            if (!targetEvent) return prev;

            const newDate = updatedEvent.date;

            //날짜가 안 바뀐 경우
            if (oldDate === newDate) {
                return {
                    ...prev,
                    [oldDate]: oldList.map(ev =>
                        ev.id === eventId ? { ...ev, ...updatedEvent } : ev
                    ),
                };
            }

            // 날짜가 바뀐 경우 → 이동
            return {
                ...prev,
                [oldDate]: oldList.filter(ev => ev.id !== eventId),
                [newDate]: [
                    ...(prev[newDate] || []),
                    { ...targetEvent, ...updatedEvent },
                ],
            };
        });
    };

    //일정 삭제
    const deleteEvent = (date, eventId) => {
        setEvents(prev => ({
            ...prev,
            [date]: (prev[date] || []).filter(ev => ev.id !== eventId),
        }));
    };


    return (
        <CalendarContext.Provider 
        value={{
            currentDate,
            setCurrentDate,
            events,
            addEvent,
            updateEvent,
            deleteEvent,
            }}>
        {children}
        </CalendarContext.Provider>
    );
}

export const useCalendar = () => useContext(CalendarContext);
