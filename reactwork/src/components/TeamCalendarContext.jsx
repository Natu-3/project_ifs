import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getTeamCalendars, createTeamCalendar, deleteTeamCalendar } from "../api/teamCalendar";

const TeamCalendarContext = createContext({
    teams: [],
    addTeam: async () => null,
    removeTeam: async () => {},
    loading: false,
    loadTeams: async () => {},
    getTeamRole: () => null
});

export function TeamCalendarProvider({children}){
    const { user } = useAuth();
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // 로그인한 사용자의 팀 캘린더 목록 불러오기
    const loadTeams = async () => {
        if (!user?.id) {
            setTeams([]);
            return;
        }
        
        try {
            setLoading(true);
            // user.id를 직접 전달 (로그인한 사용자의 ID)
            const response = await getTeamCalendars();
            // 백엔드 응답 형식에 맞게 변환 (필요시 수정)
            const teamList = response.data || [];
            const normalizedTeams = Array.isArray(teamList)
                ? teamList.map(team => ({
                    ...team,
                    currentUserRole: team.currentUserRole || "OWNER"
                }))
                : [];
            setTeams(normalizedTeams);
        } catch (error) {
            console.error("팀 캘린더 불러오기 실패:", error);
            setTeams([]);
        } finally {
            setLoading(false);
        }
    };
    
    // 로그인 상태 변경 시 팀 목록 불러오기
    useEffect(() => {
        if (!user) {
            // 로그아웃 시 빈 배열로 초기화
            setTeams([]);
            return;
        }
        
        // 로그인 시 팀 목록 불러오기
        loadTeams();
    }, [user?.id]);
    
    // 팀 캘린더 추가
    const addTeam = async (name) => {
        if (!user?.id) {
            alert("로그인이 필요합니다.");
            return null;
        }
        
        try {
            
            const response = await createTeamCalendar(name.trim());
            const newTeam = response.data;
            
            // 서버에서 받은 팀 정보로 상태 업데이트
              setTeams(prev => [...prev, {
                ...newTeam,
                currentUserRole: newTeam?.currentUserRole || "OWNER"
            }]);
            return newTeam;
        } catch (error) {
            console.error("팀 캘린더 생성 실패:", error);
            alert("팀 캘린더 생성에 실패했습니다.");
            throw error;
        }
    };
    
    // 팀 캘린더 삭제
    const removeTeam = async (teamId) => {
        if (!user?.id) {
            alert("로그인이 필요합니다.");
            return;
        }
        
        try {
            // teamId를 숫자로 변환 (백엔드에서 Long으로 받음)
            const teamIdNum = typeof teamId === 'string' ? Number(teamId) : teamId;
            // user.id를 직접 전달 (로그인한 사용자의 ID)
            await deleteTeamCalendar(user.id, teamIdNum);
            // 삭제 성공 시 상태에서 제거 (숫자로 비교)
            setTeams(prev => prev.filter(team => {
                const tId = typeof team.id === 'string' ? Number(team.id) : team.id;
                return tId !== teamIdNum;
            }));
        } catch (error) {
            console.error("팀 캘린더 삭제 실패:", error);
            alert("팀 캘린더 삭제에 실패했습니다.");
            throw error;
        }
    };


     const getTeamRole = (teamId) => {
        const targetTeamId = typeof teamId === "string" ? Number(teamId) : teamId;
        const target = teams.find(team => {
            const tId = typeof team.id === "string" ? Number(team.id) : team.id;
            return tId === targetTeamId;
        });

        return target?.currentUserRole || null;
    };

    
    return(
         <TeamCalendarContext.Provider value={{ teams, addTeam, removeTeam, loading, loadTeams, getTeamRole }}>
            {children}
        </TeamCalendarContext.Provider>
    )
}

export const useTeamCalendar = () => useContext(TeamCalendarContext);