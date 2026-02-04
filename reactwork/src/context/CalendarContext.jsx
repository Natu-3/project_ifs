import { createContext, useContext, useState } from "react";

const CalendarContext = createContext();

export function CalendarProvider({ children }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState({});

    const addEvent = (dateKey, event) => {
        setEvents(prev => ({
            ...prev,
            [dateKey]: prev[dateKey]
            ? [...prev[dateKey], event]
            : [event],
        }));
    };

    return (
        <CalendarContext.Provider 
        value={{ currentDate, setCurrentDate, events, addEvent }}>
        {children}
        </CalendarContext.Provider>
    );
}

export const useCalendar = () => useContext(CalendarContext);
