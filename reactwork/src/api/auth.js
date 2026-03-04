import axios from "axios";
const API_BASE = "/api/auth";


export const login = (userid, password) => {
    return axios.post(
        `${API_BASE}/login`,
        { userid, password },
        { withCredentials: true }
    );
};


export const signup = (userid, password, email, name) => {
  return axios.post(`${API_BASE}/signup`, {
    userid,
    password,
    email: email || null,
    name: name || null,
  });
}

export const updateUserProfile = (userId, data) => {
  return axios.put(`${API_BASE}/profile?userId=${userId}`, data, {
    withCredentials: true
  });
}

export const changePassword = (currentPassword, newPassword) => {
  return axios.put(`${API_BASE}/password`, { currentPassword, newPassword }, {
    withCredentials: true
  });
}



export const logout = () => {
    return axios.post(
        `${API_BASE}/logout`,
        {},
        { withCredentials: true }
    );
};

