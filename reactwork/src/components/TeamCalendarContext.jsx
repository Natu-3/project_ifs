import { createContext, useContext, useState } from "react";

const TeamCalendarContext = createContext();

export function TeamCalendarProvider({children}){
    const [teams, setTeams] = useState([]);

    const addTeam = (name) => {
        const newTeam = { id: Date.now().toString(), name };
        setTeams(prev => [...prev, newTeam]);
        return newTeam;
    }
    return(
        <TeamCalendarContext.Provider value={{ teams, addTeam }}>
            {children}
        </TeamCalendarContext.Provider>
    )
}

export const useTeamCalendar = () => useContext(TeamCalendarContext);