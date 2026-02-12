import { useLocation, useNavigate } from "react-router-dom";
import MiniCalendar from "./calendars/MiniCalendar";
import { useTeamCalendar } from "./TeamCalendarContext";
import { useSchedule } from "../context/ScheduleContext";
import { useAuth } from "../context/AuthContext";
import { useMemo, useState } from "react";
import TeamMemberManageModal from "./TeamMemberManageModal.jsx";
import "../componentsCss/CalendarPanel.css";

export default function CalendarPanel() {
    const navigate = useNavigate();
    const location = useLocation();
    const { teams, addTeam, removeTeam } = useTeamCalendar();
    const { initializeTeamCalendar, removeTeamCalendar } = useSchedule();
    const { user } = useAuth();
    
    const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);

    const createTeam = async () => {
    const name = prompt("팀 이름을 입력하세요:");
    if (!name) return;

    try {
      const newTeam = await addTeam(name.trim());
      if (!newTeam?.id) return;
      const teamIdStr = String(newTeam.id);
      initializeTeamCalendar(teamIdStr);
      navigate(`/calendar/team/${teamIdStr}`);
    } catch (error) {
      console.error("팀 생성 실패:", error);
    }
};

  const isPersonalActive = location.pathname === "/calendar";
  const activeTeamId = location.pathname.startsWith("/calendar/team/")
    ? location.pathname.split("/calendar/team/")[1]
    : null;
  const activeTeamIdNum = activeTeamId ? Number(activeTeamId) : null;

  const activeTeam = useMemo(() => {
    if (activeTeamIdNum === null) return null;
    return (
      teams.find((t) => {
        const tId = typeof t.id === "string" ? Number(t.id) : t.id;
        return tId === activeTeamIdNum;
      }) || null
    );
  }, [teams, activeTeamIdNum]);

  const canManageMember = Boolean(
    activeTeam && user?.id && Number(activeTeam.ownerId) === Number(user.id)
  );

  const handleDeleteTeam = async () => {
    if (!activeTeamId || !activeTeam) return;

    const confirmMessage = `"${activeTeam.name}" 팀 캘린더를 삭제하시겠습니까?\n모든 일정이 삭제됩니다.`;
    if (!window.confirm(confirmMessage)) return;

    try {
      removeTeamCalendar(activeTeamId);
      await removeTeam(activeTeamIdNum);
      navigate("/", { replace: true });
    } catch (error) {
      console.error("팀 삭제 실패:", error);
    }   
    };

    return (
    <aside className="calendar">
      <div className="calendar-content">
        <div className="calendar-scrollable">
          <div>
            <h2 className="calendar-section-title">캘린더</h2>

            <div
              className={`calendar-nav-item ${isPersonalActive ? "active" : ""}`}
              onClick={() => navigate("/calendar")}
              role="button"
              tabIndex={0}
            >
              <span className="calendar-nav-icon"></span>
              <span className="calendar-nav-label">개인 캘린더</span>
            </div>
            <MiniCalendar />
          </div>
          <div>
            <div className="calendar-team-header">
              <h2 className="calendar-section-title">팀 캘린더</h2>
              <button className="calendar-add-team-btn" onClick={createTeam} title="팀 캘린더 생성">
                + 새 팀
              </button>
            </div>

            <div className="calendar-team-list">
              {teams.length === 0 && (
                <div className="calendar-empty-hint">
                  아직 팀 캘린더가 없어요. <b>+ 새 팀</b>으로 만들어보세요.
                    </div>
                )}

              {teams.map((team) => {
                const teamIdNum = typeof team.id === "string" ? Number(team.id) : team.id;
                const isActive = activeTeamIdNum !== null && teamIdNum === activeTeamIdNum;

                return (
                  <div
                    key={team.id}
                    className={`calendar-nav-item ${isActive ? "active" : ""}`}
                    onClick={() => navigate(`/calendar/team/${team.id}`)}
                    role="button"
                    tabIndex={0}
                    title={team.name}
                  >
                    <span className="calendar-nav-icon"></span>
                    <span className="calendar-nav-label">{team.name}</span>
                  </div>
                );
              })}
            </div>
            </div>
        </div>

        {activeTeamId && (
          <div className="calendar-delete-section">
            <button
              className="calendar-delete-team-btn"
              onClick={() => setIsMemberModalOpen(true)}
              title={canManageMember ? "멤버 관리" : "owner만 멤버 관리 가능"}
            >
              멤버 관리
            </button>
            <button className="calendar-delete-team-btn" onClick={handleDeleteTeam} title="팀 캘린더 삭제">
              팀 캘린더 삭제
            </button>
          </div>
        )}
      </div>

      <TeamMemberManageModal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        calendarId={activeTeamIdNum}
        actorUserId={user?.id}
        readOnly={!canManageMember}
      />
    </aside>
  );
}
                
                
                