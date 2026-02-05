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
    const updateEvent = (date, eventId, updatedData) => {
        setEvents(prev => ({
        ...prev,
        [date]: prev[date].map(ev =>
            ev.id === eventId ? { ...ev, ...updatedData } : ev
        ),
        }));
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
