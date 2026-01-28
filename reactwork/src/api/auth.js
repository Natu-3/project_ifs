import axios from "axios";

export const login = (userid, password) => {
  return axios.post(
    "/api/auth/login",
    { userid, password },
    { withCredentials: true }
  );
};
