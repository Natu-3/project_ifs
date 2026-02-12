import axios from 'axios';
//api 선언부 json형태로 받아서 사용할것
const api = axios.create({
    baseURL: "/api",
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});

// // 인터셉터 (토큰 자동으로 넣어주기)
// api.interceptors.request.use((config)=> {
//     const token = localStorage.getItem("accessToken");
//     if(token){
//         config.headers.Authorization = "Bearer ${token}";
//     } 
//     //앞으로 사용할 때 "Bearer ${token}으로 선언할 것"
//     return config;
// });

export default api;