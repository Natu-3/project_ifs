import api from "./axios";

// 팀 캘린더 목록 조회
export const getTeamCalendars = (userId) => {
  if (!userId) {
    return Promise.resolve({ data: [] });
  }
  return api.get(`/team-calendars?userId=${userId}`);
};

// 팀 캘린더 생성
export const createTeamCalendar = (userId, name) => {
  if (!userId) {
    return Promise.reject(new Error("로그인이 필요합니다."));
  }
  return api.post(`/team-calendars?userId=${userId}`, { name });
};

// 팀 캘린더 삭제
export const deleteTeamCalendar = (userId, teamId) => {
  if (!userId) {
    return Promise.reject(new Error("로그인이 필요합니다."));
  }
  return api.delete(`/team-calendars/${teamId}?userId=${userId}`);
};

