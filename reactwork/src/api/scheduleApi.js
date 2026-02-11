import axios from "axios";

export const getMonthSchedules = (year, month) => {
    return axios.get("/api/schedules", {
        params: { year, month },
        withCredentials: true,
    })
}

export const createSchedule = (scheduleData) => {
    return axios.post("/api/schedules", scheduleData,{
        withCredentials: true,
    })
}

export const updateSchedule = (scheduleId, scheduleData) => {
    return axios.put(`/api/schedules/${scheduleId}`, scheduleData, {
        withCredentials: true,
    });
};

export const deleteSchedule = (scheduleId) => {
    return axios.delete(`/api/schedules/${scheduleId}`, {
        withCredentials: true,
    });
};