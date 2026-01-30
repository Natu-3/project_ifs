import { useNavigate } from "react-router-dom";
import MiniCalendar from "./calendars/MiniCalendar";
import '../componentsCss/CalendarPanel.css'

export default function CalendarPanel() {
    const navigate = useNavigate();

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
                    <h2>팀 캘린더</h2>
                <button>+</button>
                </div>
            </div>
        </aside>
    )
}