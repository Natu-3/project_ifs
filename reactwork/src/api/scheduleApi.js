import axios from "axios";

export const getMonthSchedules = (year, month) => {
    return axios.get("/schedule", {
        params: { year, month },
        withCredentials: true,
    })
}

export const createSchedule = (scheduleData) => {
    return axios.post("/schedule", scheduleData, {
        withCredentials: true,
    });
};

export const updateSchedule = (scheduleId, scheduleData) => {
    return axios.put(`/schedule/${scheduleId}`, scheduleData, {
        withCredentials: true,
    });
};

export const deleteSchedule = (scheduleId) => {
    return axios.delete(`/schedule/${scheduleId}`, {
        withCredentials: true,
    });
};