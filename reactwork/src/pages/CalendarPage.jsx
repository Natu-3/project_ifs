import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCalendar } from "../context/CalendarContext";
import { useTeamCalendar } from "../components/TeamCalendarContext";
import CalendarHeader from "../components/calendars/CalendarHeader";
import CalendarGrid from "../components/calendars/CalendarGrid";
import CalendarPopup from "../components/calendars/CalendarPopup";
import "./CalendarPage.css"

export default function CalendarPage() {
  const { currentDate, setCurrentDate, setActiveCalendarId, initializeTeamCalendar, removeTeamCalendar } = useCalendar();
  const { teamId } = useParams();
  const { teams, removeTeam } = useTeamCalendar();
  const navigate = useNavigate();

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

  // 팀 캘린더 삭제 핸들러
  const handleDeleteTeam = () => {
    if (!teamId || !team) return;
    
    const confirmMessage = `"${team.name}" 팀 캘린더를 삭제하시겠습니까?\n모든 일정이 삭제됩니다.`;
    if (!window.confirm(confirmMessage)) return;
    
    // 팀 캘린더의 이벤트도 삭제
    removeTeamCalendar(teamId);
    // 팀 목록에서 제거
    removeTeam(teamId);
    // 개인 캘린더로 이동
    navigate("/calendar");
  }

  return (
    <section className="calendar-page">
      <CalendarHeader
        currentDate={currentDate}
        onChange={setCurrentDate}
        title={title}
      />
      {teamId && (
        <div className="calendar-delete-wrapper">
          <button 
            className="calendar-delete-team-btn" 
            onClick={handleDeleteTeam}
            title="팀 캘린더 삭제"
          >
            팀 캘린더 삭제
          </button>
        </div>
      )}
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