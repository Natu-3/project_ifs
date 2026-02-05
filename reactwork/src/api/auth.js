import axios from "axios";
const API_BASE = "http://localhost:8080/api/auth";


export const login = (userid, password) => {
    return axios.post(
        `${API_BASE}/login`,
        { userid, password },
        { withCredentials: true }
    );
};


export const signup = (userid, password) => {
  return axios.post(`${API_BASE}/signup`, {
    userid,
    password,
  });}



export const logout = () => {
    return axios.post(
        `${API_BASE}/logout`,
        {},
        { withCredentials: true }
    );
};

