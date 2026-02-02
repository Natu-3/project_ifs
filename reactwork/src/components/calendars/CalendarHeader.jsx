import { useNavigate } from "react-router-dom";

export default function CalendarHeader({ currentDate, onChange}){
    const navigate = useNavigate();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const moveMonth = (diff) => {
        onChange(new Date(year, month + diff, 1));
    };

    return(
        <div className="calendar-header">
            <button onClick={()=> moveMonth(-1) }>◀</button>
            <span>{year}년 {month +1}월</span>
            <button onClick={()=> moveMonth(1)}>▶</button>
            <button onClick={() => navigate("/")} className="calendar-home-but">홈</button>
        </div>
        
    )
}