import { createContext, useContext, useState } from "react";

const TeamCalendarContext = createContext();

export function TeamCalendarProvider({ children }) {
  const [teamEvents, setTeamEvents] = useState([]);

  const addTeamEvent = (event) => {
    setTeamEvents(prev => [...prev, event]);
  };

  const removeTeamEvent = (id) => {
    setTeamEvents(prev => prev.filter(e => e.id !== id));
  };

  return (
    <TeamCalendarContext.Provider
      value={{
        teamEvents,
        addTeamEvent,
        removeTeamEvent,
      }}
    >
      {children}
    </TeamCalendarContext.Provider>
  );
}

export function useTeamCalendar() {
  return useContext(TeamCalendarContext);
}
