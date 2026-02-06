import { getHolidayNames } from "@hyunbinseo/holidays-kr";
import { useCalendar } from "../../context/CalendarContext";
import { getMonthDays } from "../../utils/calendar";
import '../../componentsCss/calendarsCss/MiniCalendar.css'

export default function MiniCalendar() {
    const { setCurrentDate, events } = useCalendar();
  
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    const days = getMonthDays(year, month);
    const week = ["일","월","화","수","목","금","토"];
    

    return (
        <div className="mini-calendar">
            <div className="mini-header">
                <span>{year}년 {month +1}월</span>
            </div>
            <div className="mini-grid">
                {week.map(d => (
          <div key={d} className="mini-week">{d}</div>
        ))}

        {days.map((day, i) => {
          if (!day) return <div key={i} className="mini-cell empty"></div>;

          const date = new Date(year, month, day);

          const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayEvents = events?.[dateKey] || [];

          // 공휴일 이름 배열 또는 null
          const holidayNames = getHolidayNames(date);
          const isHoliday = !!holidayNames;
          const holidayText = holidayNames?.join(", ");

          const isToday =
            year === today.getFullYear() &&
            month === today.getMonth() &&
            day === today.getDate();

          const dayOfweek = i % 7;

          return (
            <div
              key={i}
              className={`
                mini-cell
                ${isToday ? "today" : ""}
                ${isHoliday ? "holiday" : ""}
                ${i % 7 === 0 ? "sunday" : i % 7 === 6 ? "saturday" : ""}
              `}
              title={holidayText}
              onClick={() => setCurrentDate(date)}
            >
              <div className="day-number">{day}</div>

              {dayEvents.length > 0 &&(
                <div className="event-lines">
                  {dayEvents.slice(0, 3).map(ev =>(
                    <span
                      key={ev.id}
                      className="event-line"
                      style={{ backgroundColor: ev.color || "#4CAF50" }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}