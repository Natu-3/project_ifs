import { useEffect } from "react";
import { getHolidayNames } from "@hyunbinseo/holidays-kr";
import { useCalendar } from "../../context/CalendarContext";
import { useSchedule } from "../../context/ScheduleContext";
import { usePosts } from "../../context/PostContext";
import { getMonthDays } from "../../utils/calendar";
import '../../componentsCss/calendarsCss/MiniCalendar.css'

export default function MiniCalendar() {
    const { setCurrentDate } = useCalendar();
    const { fetchSchedules, getPersonalEventsForMonth, getScheduleColor } = useSchedule();
    const { posts } = usePosts();
  
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    const days = getMonthDays(year, month);
    const week = ["일","월","화","수","목","금","토"];
    
    // 개인 캘린더의 이벤트 가져오기
    useEffect(() => {
      fetchSchedules(year, month + 1);
    }, [year, month, fetchSchedules]);

    // 개인 캘린더 로컬 + 서버 이벤트 병합
    const personalEvents = getPersonalEventsForMonth(year, month + 1);

    const sortByPriorityAndTime = (a, b) => {
        const ap = Number.isFinite(Number(a?.priority)) ? Number(a.priority) : 2;
        const bp = Number.isFinite(Number(b?.priority)) ? Number(b.priority) : 2;
        if (ap !== bp) return ap - bp;

        const as = a?.startAt || `${a?.dateKey || ""}T00:00:00`;
        const bs = b?.startAt || `${b?.dateKey || ""}T00:00:00`;
        return String(as).localeCompare(String(bs));
    };   

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
          // 개인 캘린더의 해당 날짜 이벤트 가져오기
          const dayEvents = personalEvents[dateKey] || [];

          // 공휴일 이름 배열 또는 null
          const holidayNames = getHolidayNames(date);
          const isHoliday = !!holidayNames;
          const holidayText = holidayNames?.join(", ");

          const isToday =
            year === today.getFullYear() &&
            month === today.getMonth() &&
            day === today.getDate();

          //const dayOfweek = i % 7;

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
                   {[...dayEvents].sort(sortByPriorityAndTime).slice(0, 3).map(ev => {
                    // priority를 우선 확인 (메모에서 온 일정이든 직접 추가한 일정이든)
                    const eventColor = getScheduleColor(ev, posts);
                    return (
                      <span
                        key={ev.id}
                        className="event-line"
                        style={{ backgroundColor: eventColor }}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}