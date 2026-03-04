import api from "./axios";

export const getAdminDashboardToday = () => api.get("/admin/dashboard/today");

export const getAdminUsers = ({ page = 0, size = 20, keyword = "" } = {}) =>
  api.get("/admin/users", { params: { page, size, keyword } });

export const updateAdminUserRole = (userId, auth) =>
  api.patch(`/admin/users/${userId}/role`, { auth });

export const markAdminResetPasswordRequired = (userId) =>
  api.post(`/admin/users/${userId}/reset-password-required`);

