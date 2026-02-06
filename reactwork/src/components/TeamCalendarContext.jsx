import { createContext, useContext, useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";

const TeamCalendarContext = createContext();

export function TeamCalendarProvider({children}){
    const { user } = useAuth();
    
    // localStorage 키 생성
    const getStorageKey = (userId = null) => {
        const id = userId || user?.id || localStorage.getItem('userId') || 'guest';
        return `team_calendars:${id}`;
    };
    
    // 초기 로드 시 localStorage에서 복원
    const [teams, setTeams] = useState(() => {
        try {
            const storageKey = getStorageKey();
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                return Array.isArray(parsed) ? parsed : [];
            }
        } catch (e) {
            console.error('팀 캘린더 복원 실패:', e);
        }
        return [];
    });
    
    // localStorage에 저장하는 ref (무한 루프 방지)
    const isInitialMount = useRef(true);
    const hydratedRef = useRef(false);
    const migratedGuestToUserRef = useRef(false);
    
    // userId 변경 시 팀 목록 복원 및 guest -> user 마이그레이션
    useEffect(() => {
        if (hydratedRef.current) return;
        
        try {
            const userId = user?.id || localStorage.getItem('userId');
            const userStorageKey = userId ? `team_calendars:${userId}` : null;
            const guestStorageKey = 'team_calendars:guest';
            
            // 로그인한 사용자의 경우 guest에서 마이그레이션
            if (userId && !migratedGuestToUserRef.current) {
                const userRaw = userStorageKey ? localStorage.getItem(userStorageKey) : null;
                const guestRaw = localStorage.getItem(guestStorageKey);
                
                if ((!userRaw || userRaw === '[]') && guestRaw && guestRaw !== '[]') {
                    // guest 데이터를 user로 복사
                    localStorage.setItem(userStorageKey, guestRaw);
                    const parsed = JSON.parse(guestRaw);
                    if (Array.isArray(parsed)) {
                        setTeams(parsed);
                    }
                    migratedGuestToUserRef.current = true;
                    hydratedRef.current = true;
                    return;
                }
                migratedGuestToUserRef.current = true;
            }
            
            // user 데이터 복원
            if (userStorageKey) {
                const saved = localStorage.getItem(userStorageKey);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed)) {
                        setTeams(parsed);
                    }
                }
            } else {
                // guest 데이터 복원
                const saved = localStorage.getItem(guestStorageKey);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed)) {
                        setTeams(parsed);
                    }
                }
            }
            
            hydratedRef.current = true;
        } catch (e) {
            console.error('팀 캘린더 복원 실패:', e);
            hydratedRef.current = true;
        }
    }, [user?.id]);
    
    // teams가 변경될 때마다 localStorage에 저장
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        
        if (!hydratedRef.current) return; // 복원 전에는 저장하지 않음
        
        try {
            const userId = user?.id || localStorage.getItem('userId') || 'guest';
            const storageKey = `team_calendars:${userId}`;
            localStorage.setItem(storageKey, JSON.stringify(teams));
        } catch (e) {
            console.error('팀 캘린더 저장 실패:', e);
        }
    }, [teams, user?.id]);

    const addTeam = (name) => {
        const newTeam = { id: Date.now().toString(), name };
        setTeams(prev => [...prev, newTeam]);
        return newTeam;
    }
    
    return(
        <TeamCalendarContext.Provider value={{ teams, addTeam }}>
            {children}
        </TeamCalendarContext.Provider>
    )
}

export const useTeamCalendar = () => useContext(TeamCalendarContext);