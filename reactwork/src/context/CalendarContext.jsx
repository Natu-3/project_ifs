import { createContext, useContext, useState } from "react";

const CalendarContext = createContext();

export function CalendarProvider({ children }) {
    // 현재 선택된 날짜
    const [currentDate, setCurrentDate] = useState(new Date());
    
    // 현재 활성화된 캘린더 ID (null이면 개인 캘린더, 문자열이면 팀 캘린더)
    const [activeCalendarId, setActiveCalendarId] = useState(null);

    return (
        <CalendarContext.Provider 
        value={{
            currentDate,
            setCurrentDate,
            activeCalendarId,
            setActiveCalendarId,
        }}>
        {children}
        </CalendarContext.Provider>
    );
}

export const useCalendar = () => useContext(CalendarContext);
