import axios from "axios";

export const getMonthSchedules = (year, month) => {
    return axios.get("/schedule", {
        params: { year, month },
        withCredentials: true,
    })
}