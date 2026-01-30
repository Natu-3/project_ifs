import { getHolidayNames } from "@hyunbinseo/holidays-kr";
import { getMonthDays } from "../../utils/calendar";

export default function CalendarGrid({ currentDate }) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const week = ["일","월","화","수","목","금","토"];
  const today = new Date();

  const days = getMonthDays(year, month);

  return (
    <div className="calendar-grid">
      {week.map((d, i) => (
        <div key={d} className={`day-header ${i === 0? "sun" : i === 6 ? "sat" : ""}`}>
          {d}
        </div>
      ))}

      {days.map((day, i) => {
        if (!day) return <div key={`empty-${i}`} className="calendar-cell empty"></div>;

        const date = new Date(year, month, day);
        const holidayNames = getHolidayNames(date);
        const isHoliday = !!holidayNames

        const isToday =
          year === today.getFullYear() &&
          month === today.getMonth() &&
          day === today.getDate();

        const dayOfweek = i % 7;
      
        return (
          <div
            key={i}
            className={`
              calendar-cell
              ${isToday ? "today" : ""}
              ${isHoliday ? "holiday" : ""}
              ${dayOfweek === 0 ? "sun" : dayOfweek === 6 ? "sat" : ""}
            `}
          >
            <div className="cell-header">
              <span className="day-number">{day}</span>
              {isHoliday && <span className="holiday-name">{holidayNames[0]}</span>}
            </div>
            <div className="memo-content"></div>
          </div>
        );
      })}
    </div>
  );
}
