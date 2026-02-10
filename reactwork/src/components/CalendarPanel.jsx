import { useLocation, useNavigate } from "react-router-dom";
import MiniCalendar from "./calendars/MiniCalendar";
import { useTeamCalendar } from "./TeamCalendarContext";
import { useCalendar } from "../context/CalendarContext";
import { useAuth } from "../context/AuthContext";
import { useEffect } from "react";
import '../componentsCss/CalendarPanel.css'

export default function CalendarPanel() {
    const navigate = useNavigate();
    const location = useLocation();
    const { teams, addTeam, removeTeam } = useTeamCalendar();
    const { initializeTeamCalendar, removeTeamCalendar } = useCalendar();

    const createTeam = async () => {
        const name = prompt("팀 이름을 입력하세요:");
        if (!name) return;
        
        try {
            const newTeam = await addTeam(name.trim());
            if (!newTeam?.id) return;
            // newTeam.id는 백엔드에서 Long으로 반환되므로 문자열로 변환
            const teamIdStr = String(newTeam.id);
            initializeTeamCalendar(teamIdStr); // 새 팀 캘린더는 빈 상태로 시작
            navigate(`/calendar/team/${teamIdStr}`);
        } catch (error) {
            // 에러는 addTeam에서 이미 처리됨
            console.error("팀 생성 실패:", error);
        }
    }

    const isPersonalActive = location.pathname === "/calendar";
    const activeTeamId = location.pathname.startsWith("/calendar/team/")
        ? location.pathname.split("/calendar/team/")[1]
        : null;
    
    // teamId를 숫자로 변환하여 비교 (백엔드에서 Long으로 반환)
    const activeTeamIdNum = activeTeamId ? Number(activeTeamId) : null;

    const handleDeleteTeam = async () => {
        if (!activeTeamId) return;
        
        // activeTeamId를 숫자로 변환하여 team 찾기
        const activeTeamIdNum = Number(activeTeamId);
        const team = teams.find(t => {
            const tId = typeof t.id === 'string' ? Number(t.id) : t.id;
            return tId === activeTeamIdNum;
        });
        
        if (!team) return;
        
        const confirmMessage = `"${team.name}" 팀 캘린더를 삭제하시겠습니까?\n모든 일정이 삭제됩니다.`;
        if (!window.confirm(confirmMessage)) return;
        
        try {
            // 팀 캘린더의 이벤트도 삭제
            removeTeamCalendar(activeTeamId);
            // 팀 목록에서 제거 (숫자로 변환하여 전달)
            await removeTeam(activeTeamIdNum);
            // 개인 캘린더로 이동
            navigate("/calendar");
        } catch (error) {
            console.error("팀 삭제 실패:", error);
        }
    }

    return(
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

                        {teams.map(team => {
                            // team.id와 activeTeamId를 숫자로 비교
                            const teamIdNum = typeof team.id === 'string' ? Number(team.id) : team.id;
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
                
                {/* 팀 캘린더 삭제 버튼 (팀 캘린더 페이지에 있을 때만 표시) */}
                {activeTeamId && (
                    <div className="calendar-delete-section">
                        <button 
                            className="calendar-delete-team-btn" 
                            onClick={handleDeleteTeam}
                            title="팀 캘린더 삭제"
                        >
                            팀 캘린더 삭제
                        </button>
                    </div>
                )}
            </div>
        </aside>
    )
}