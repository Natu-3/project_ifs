import api from "./axios";

const buildBody = (targetId, targetType = "SCHEDULE") => ({
  targetType,
  targetId: String(targetId),
});

export const acquireTeamCalendarLock = (calendarId, targetId, targetType = "SCHEDULE") =>
  api.post(`/team-calendars/${calendarId}/locks/acquire`, buildBody(targetId, targetType), {
    withCredentials: true,
  });

export const refreshTeamCalendarLock = (calendarId, targetId, targetType = "SCHEDULE") =>
  api.post(`/team-calendars/${calendarId}/locks/refresh`, buildBody(targetId, targetType), {
    withCredentials: true,
  });

export const releaseTeamCalendarLock = (calendarId, targetId, targetType = "SCHEDULE") =>
  api.post(`/team-calendars/${calendarId}/locks/release`, buildBody(targetId, targetType), {
    withCredentials: true,
  });

export const authorizeTeamCalendarWrite = (calendarId, targetId, targetType = "SCHEDULE") =>
  api.post(`/team-calendars/${calendarId}/locks/authorize-write`, buildBody(targetId, targetType), {
    withCredentials: true,
  });

export const getTeamCalendarLockStatus = (calendarId, targetId, targetType = "SCHEDULE") =>
  api.get(`/team-calendars/${calendarId}/locks`, {
    params: {
      targetType,
      targetId: String(targetId),
    },
    withCredentials: true,
  });