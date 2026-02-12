import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCalendar } from "../context/CalendarContext";
import { useSchedule } from "../context/ScheduleContext";
import { useTeamCalendar } from "../components/TeamCalendarContext";
import { useAuth } from "../context/AuthContext";
import CalendarHeader from "../components/calendars/CalendarHeader";
import CalendarGrid from "../components/calendars/CalendarGrid";
import SchedulePopup from "../components/schedules/SchedulePopup";
import TeamMemberManageModal from "../components/TeamMemberManageModal";
import useTeamScheduleRealtime from "../hooks/useTeamScheduleRealtime";
import "./CalendarPage.css";

export default function CalendarPage() {
  const { currentDate, setCurrentDate, setActiveCalendarId } = useCalendar();
  const { initializeTeamCalendar, removeTeamCalendar, fetchSchedules, createEvent } = useSchedule();
  const { teamId } = useParams();
  const { teams, removeTeam } = useTeamCalendar();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const menuRef = useRef(null);

  const teamIdNum = teamId ? Number(teamId) : null;
  const team = useMemo(() => {
    return teams.find((t) => {
      const tId = typeof t.id === "string" ? Number(t.id) : t.id;
      return tId === teamIdNum;
    });
  }, [teams, teamIdNum]);

  const canManageTeam = Boolean(team && user?.id && Number(team.ownerId) === Number(user.id));
  const title = team ? team.name : "개인 캘린더";

  useEffect(() => {
    if (teamId) {
      setActiveCalendarId(teamId);
      initializeTeamCalendar(teamId);
    } else {
      setActiveCalendarId(null);
    }
  }, [teamId, setActiveCalendarId, initializeTeamCalendar]);

  const [popupOpen, setPopupOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [latestRealtimeEvent, setLatestRealtimeEvent] = useState(null);

  const handleRealtimeUpdate = useCallback(async (payload) => {
    setLatestRealtimeEvent(payload || null);
    if (!teamIdNum) return;
    await fetchSchedules(currentDate.getFullYear(), currentDate.getMonth() + 1, teamIdNum);
  }, [teamIdNum, fetchSchedules, currentDate]);

  useTeamScheduleRealtime({
    calendarId: teamIdNum,
    onUpdate: handleRealtimeUpdate,
  });

  const openPopup = (date, event = null) => {
    setSelectedDate(date);
    setSelectedEvent(event);
    setPopupOpen(true);
  };

  const handleDateRangeSelect = (startDate, endDate) => {
    setSelectedDate(startDate);
    setSelectedEvent({ startDate, endDate });
    setPopupOpen(true);
  };

  const handleDrop = async (dateKey, eventData) => {
    if (!eventData?.title) return;

    try {
      await createEvent({
        title: eventData.title,
        content: eventData.content || "",
        startDate: dateKey,
        endDate: dateKey,
        postId: eventData.postId || null,
        priority: eventData.priority ?? 2,
      });

      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      if (teamIdNum) {
        await fetchSchedules(year, month, teamIdNum);
      } else {
        await fetchSchedules(year, month);
      }
    } catch (error) {
      console.error("드롭 일정 생성 실패:", error);
      alert("일정 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  const closePopup = () => {
    setPopupOpen(false);
    setSelectedDate(null);
    setSelectedEvent(null);
  };

  const handleDeleteTeam = async () => {
    if (!teamId || !team || !canManageTeam) return;

    const confirmMessage = `"${team.name}" 팀 캘린더를 삭제하시겠습니까?\n모든 일정이 삭제됩니다.`;
    if (!window.confirm(confirmMessage)) return;

    try {
      const teamIdToDelete = typeof team.id === "string" ? Number(team.id) : team.id;
      removeTeamCalendar(teamId);
      await removeTeam(teamIdToDelete);
      setIsMenuOpen(false);
      navigate("/");
    } catch (error) {
      console.error("팀 삭제 실패:", error);
    }
  };

  const openMemberModal = () => {
    setIsMenuOpen(false);
    setIsMemberModalOpen(true);
  };

  return (
    <section className="calendar-page">
      <CalendarHeader currentDate={currentDate} onChange={setCurrentDate} title={title} />

      {teamId && (
        <div className="calendar-action-wrapper">
          <div className="calendar-action-menu" ref={menuRef}>
            <button
              className="calendar-action-hamburger"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              title="팀 캘린더 메뉴"
              aria-label="팀 캘린더 메뉴"
            >
              ≡
            </button>

            {isMenuOpen && (
              <div className="calendar-action-dropdown">
                <button
                  className="calendar-action-item"
                  onClick={openMemberModal}
                  disabled={!canManageTeam}
                  title={canManageTeam ? "멤버 관리" : "owner만 멤버 관리 가능"}
                >
                  멤버 관리
                </button>
                <button
                  className="calendar-action-item danger"
                  onClick={handleDeleteTeam}
                  disabled={!canManageTeam}
                  title={canManageTeam ? "팀 캘린더 삭제" : "owner만 팀 삭제 가능"}
                >
                  팀 캘린더 삭제
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <CalendarGrid
        currentDate={currentDate}
        onDateClick={openPopup}
        onEventClick={openPopup}
        onDateRangeSelect={handleDateRangeSelect}
        onDrop={handleDrop}
      />

      {popupOpen && (
        <SchedulePopup
          date={selectedDate}
          event={selectedEvent}
          realtimeEvent={latestRealtimeEvent}
          onClose={closePopup}
        />
      )}

      <TeamMemberManageModal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        calendarId={teamIdNum}
        actorUserId={user?.id}
        readOnly={!canManageTeam}
      />
    </section>
  );
}
