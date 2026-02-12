import api from "./axios";

export const getTeamCalendarMembers = (calendarId) => {
  if (!calendarId) {
    return Promise.resolve({ data: [] });
  }

  return api.get(`/team-calendars/${calendarId}/members`, {
    withCredentials: true,
  });
};

export const addTeamCalendarMember = (calendarId, userIdentifier, role = "READ") => {
  if (!calendarId) {
    return Promise.reject(new Error("캘린더가 필요합니다."));
  }

  return api.post(
    `/team-calendars/${calendarId}/members`,
    { userIdentifier, roleRw: role },
    { withCredentials: true }
  );
};

export const updateTeamCalendarMemberRole = (calendarId, memberUserId, role) => {
  if (!calendarId) {
    return Promise.reject(new Error("캘린더가 필요합니다."));
  }

  return api.put(
    `/team-calendars/${calendarId}/members/${memberUserId}/role`,
    { roleRw: role },
     { withCredentials: true }
  );
};

export const deleteTeamCalendarMember = (calendarId, memberUserId) => {
  if (!calendarId) {
    return Promise.reject(new Error("캘린더가 필요합니다."));
  }

  return api.delete(`/team-calendars/${calendarId}/members/${memberUserId}`, {
    withCredentials: true,
  });
};