import { getHolidayNames } from "@hyunbinseo/holidays-kr";
import { getMonthDays } from "../../utils/calendar";
import { useCalendar } from "../../context/CalendarContext";
import { usePosts } from "../../context/PostContext";

export default function CalendarGrid({ currentDate }) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const week = ["일","월","화","수","목","금","토"];
  const today = new Date();

  const days = getMonthDays(year, month);

  const { events, addEvent } = useCalendar();
  const { posts } = usePosts();

  const handleDrop = (e, dateKey) => {
      e.preventDefault();

      const postId = Number(e.dataTransfer.getData("postId"));
      if (!postId) return;

      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      addEvent(dateKey, {
        id: Date.now(),
        postId: post.id,
        title: post.title,
      });
  };
  
  const getEventColor = (postId) => {
    const colors = ["#FF5733", "#33FF57", "#3357FF", "#F333FF", "#33FFF5", "#F5FF33"];
    return colors[postId % colors.length];
  };

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
        const dateKey = `${year}-${month +1}-${day}`;
      
        return (
          <div
            key={i}
            className={`
              calendar-cell
              ${isToday ? "today" : ""}
              ${isHoliday ? "holiday" : ""}
              ${dayOfweek === 0 ? "sun" : dayOfweek === 6 ? "sat" : ""}
            `}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, dateKey)}
          >
            <div className="cell-header">
              <span className="day-number">{day}</span>
              {isHoliday && <span className="holiday-name">{holidayNames[0]}</span>}
            </div>
            <div className="memo-content">
              {events[dateKey]?.map(ev => (
                <div 
                  key={ev.id}
                  className="calendar-event"
                  style={{borderLeft: `4px solid ${getEventColor(ev.postId)}`}}
                >
                  {ev.title}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
