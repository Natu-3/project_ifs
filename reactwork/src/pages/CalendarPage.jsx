import { useParams } from "react-router-dom";
import { useCalendar } from "../context/CalendarContext";
import { useTeamCalendar } from "../components/TeamCalendarContext";
import CalendarHeader from "../components/calendars/CalendarHeader";
import CalendarGrid from "../components/calendars/CalendarGrid";
import "./CalendarPage.css"

export default function CalendarPage() {
  const { currentDate, setCurrentDate } = useCalendar();
  const { teamId } = useParams();
  const { teams } = useTeamCalendar();

  const team = teams.find(t => t.id === Number(teamId));
  const title = team ? team.name : "개인 캘린더";

  return (
    <section className="calendar-page">
      <CalendarHeader
        currentDate={currentDate}
        onChange={setCurrentDate}
        title={title}
      />
      <CalendarGrid currentDate={currentDate} />
    </section>
  );
}