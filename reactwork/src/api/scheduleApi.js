import api from "./axios";

export const getMonthSchedules = (year, month) => {
    return api.get("/schedules", {
    params: { year, month },
    withCredentials: true,
  });
};

export const getTeamMonthSchedules = (calendarId, year, month) => {
  return api.post("/schedules", scheduleData, {
    withCredentials: true,
  });
};

export const createTeamSchedule = (scheduleData) => {
  return api.post("/team-schedules", scheduleData, {
    withCredentials: true,
  });
};

export const createSchedule = (scheduleData) => {
    return api.post("/schedules", scheduleData, {
        withCredentials: true,
    });
};

export const updateSchedule = (scheduleId, scheduleData) => {
    return api.put(`/schedules/${scheduleId}`, scheduleData, {
    withCredentials: true,
  });
};

export const updateTeamSchedule = (scheduleId, scheduleData) => {
  return api.put(`/team-schedules/${scheduleId}`, scheduleData, {
    withCredentials: true,
  });
};

export const deleteSchedule = (scheduleId) => {
    return api.delete(`/schedules/${scheduleId}`, {
    withCredentials: true,
  });
};

export const deleteTeamSchedule = (scheduleId, calendarId, baseVersion) => {
  return api.delete(`/team-schedules/${scheduleId}`, {
    params: { calendarId, baseVersion },
    withCredentials: true,
  });
};