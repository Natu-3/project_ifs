import { useState } from "react";
import '../componentsCss/CalendarPanel.css'

export default function CalendarPanel() {
    const [isOpen, setIsOpen] = useState(true);

    const handleToggle = () => {
        setIsOpen(prev => !prev);
    }

    return(
        <aside className={`calendar ${isOpen?'open':'closed'}`}>
            
            <button className="toggle-calendar-btn" onClick={handleToggle}>
                    {'>'}
            </button>
            <div className="calendar-content">
                <div>
                    <h2>개인 캘린더</h2>
                </div>
                <div>
                    <h2>팀 캘린더</h2>
                <button>+</button>
                </div>
            </div>
        </aside>
    )
}