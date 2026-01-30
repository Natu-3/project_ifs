import { useCalendar } from "../context/CalendarContext";
import CalendarHeader from "../components/calendars/CalendarHeader";
import CalendarGrid from "../components/calendars/CalendarGrid";
import "./CalendarPage.css"

export default function CalendarPage() {
  const { currentDate, setCurrentDate } = useCalendar();

  return (
    <section className="calendar-page">
      <CalendarHeader
        currentDate={currentDate}
        onChange={setCurrentDate}
      />
      <CalendarGrid currentDate={currentDate} />
    </section>
  );
}