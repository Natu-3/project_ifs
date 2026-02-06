import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useCalendar } from "../context/CalendarContext";
import { useTeamCalendar } from "../components/TeamCalendarContext";
import CalendarHeader from "../components/calendars/CalendarHeader";
import CalendarGrid from "../components/calendars/CalendarGrid";
import CalendarPopup from "../components/calendars/CalendarPopup";
import "./CalendarPage.css"

export default function CalendarPage() {
  const { currentDate, setCurrentDate, setActiveCalendarId, initializeTeamCalendar } = useCalendar();
  const { teamId } = useParams();
  const { teams } = useTeamCalendar();

  const team = teams.find(t => t.id === teamId);
  const title = team ? team.name : "개인 캘린더";
  
  // 팀 캘린더 ID 설정 및 초기화
  useEffect(() => {
    if (teamId) {
      setActiveCalendarId(teamId);
      initializeTeamCalendar(teamId);
    } else {
      setActiveCalendarId(null); // 개인 캘린더
    }
  }, [teamId, setActiveCalendarId, initializeTeamCalendar]);

  //팝업 관련 상태
  const [popupOpen, setPopupOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  //밥엽 열기 (추가/ 수정 공용)
  const openPopup = (date, event = null) => {
    setSelectedDate(date);
    setSelectedEvent(event);
    setPopupOpen(true);
  }

  // 날짜 범위 선택 핸들러
  const handleDateRangeSelect = (startDate, endDate) => {
    setSelectedDate(startDate);
    setSelectedEvent({ startDate, endDate }); // 범위 정보 전달
    setPopupOpen(true);
  }

  //팝업 닫기
  const closePopup = () => {
    setPopupOpen(false);
    setSelectedDate(null);
    setSelectedEvent(null);
  }

  return (
    <section className="calendar-page">
      <CalendarHeader
        currentDate={currentDate}
        onChange={setCurrentDate}
        title={title}
      />
      <CalendarGrid
        currentDate={currentDate}
        onDateClick={openPopup}
        onEventClick={openPopup}
        onDateRangeSelect={handleDateRangeSelect}
      />
      {popupOpen && (
        <CalendarPopup
          date={selectedDate}
          event={selectedEvent}
          onClose={closePopup}
        />
      )}

    </section>
  );
}