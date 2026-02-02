import { createContext, useContext, useState } from "react";

const TeamCalendarContext = createContext();

export function TeamCalendarProvider({children}){
    const [teams, setTeams] = useState([]);

    const addTeam = (name) => {
        setTeams(prev => [
            ...prev,
            { id: Date.now(), name,}
        ])
    }
    return(
        <TeamCalendarContext.Provider value={{ teams, addTeam }}>
            {children}
        </TeamCalendarContext.Provider>
    )
}

export const useTeamCalendar = () => useContext(TeamCalendarContext);