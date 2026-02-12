import api from "./axios";

export const getTeamCalendarMembers = (calendarId, userId) => {
  if (!calendarId || !userId) {
    return Promise.resolve({ data: [] });
  }

  return api.get(`/team-calendars/${calendarId}/members`, {
    params: { userId },
  });
};

export const addTeamCalendarMember = (calendarId, userId, userIdentifier, role = "READ") => {
  if (!calendarId || !userId) {
    return Promise.reject(new Error("로그인이 필요합니다."));
  }

  return api.post(
    `/team-calendars/${calendarId}/members`,
    { userIdentifier, roleRw: role },
    { params: { userId } }
  );
};

export const updateTeamCalendarMemberRole = (calendarId, actorUserId, memberUserId, role) => {
  if (!calendarId || !actorUserId) {
    return Promise.reject(new Error("로그인이 필요합니다."));
  }

  return api.patch(
    `/team-calendars/${calendarId}/members/${memberUserId}`,
    { roleRw: role },
    { params: { userId: actorUserId } }
  );
};

export const deleteTeamCalendarMember = (calendarId, actorUserId, memberUserId) => {
  if (!calendarId || !actorUserId) {
    return Promise.reject(new Error("로그인이 필요합니다."));
  }

  return api.delete(`/team-calendars/${calendarId}/members/${memberUserId}`, {
    params: { userId: actorUserId },
  });
};