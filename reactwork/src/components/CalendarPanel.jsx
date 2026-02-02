import { useNavigate } from "react-router-dom";
import MiniCalendar from "./calendars/MiniCalendar";
import { useTeamCalendar } from "./TeamCalendarContext";
import '../componentsCss/CalendarPanel.css'

export default function CalendarPanel() {
    const navigate = useNavigate();
    const { teams, addTeam } = useTeamCalendar();

    const createTeam = () => {
        const name = prompt("팀 이름을 입력하세요:");
        if (name) addTeam(name);
    }

    return(
        <aside className="calendar">            
            <div className="calendar-content">
                <div>
                    <h2 onClick={() => navigate("/calendar")} style={{cursor:"pointer"}}>
                        개인 캘린더
                    </h2>
                    <MiniCalendar />
                </div>
                <div>
                    <h2>팀 캘린더 <button onClick={createTeam}>+</button> </h2>
                        {teams.map(team => (
                            <div 
                                key={team.id}
                                onClick={()=>navigate(`/calendar/team/${team.id}`)}
                                style={{cursor:"pointer"}}
                            >
                                {team.name}
                            </div>
                        ))}
                </div>
            </div>
        </aside>
    )
}