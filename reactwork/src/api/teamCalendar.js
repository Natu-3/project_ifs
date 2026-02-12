import api from "./axios";

// 팀 캘린더 목록 조회
export const getTeamCalendars = () => {
  return api.get(`/team-calendars`, { withCredentials: true });
};

// 팀 캘린더 생성
export const createTeamCalendar = (name) => {
  return api.post(`/team-calendars`, { name }, { withCredentials: true });
};

// 팀 캘린더 삭제
export const deleteTeamCalendar = (teamId) => {
  return api.delete(`/team-calendars/${teamId}`, { withCredentials: true });
};

