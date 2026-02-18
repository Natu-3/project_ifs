import axios from "axios";

const chatApi = axios.create({
  baseURL: "/chat-api/v1",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const createChatSession = (title = null) => chatApi.post("/sessions", { title });

export const getChatSessions = (limit = 20, offset = 0) =>
  chatApi.get("/sessions", { params: { limit, offset } });

export const getChatMessages = (sessionId, limit = 100) =>
  chatApi.get(`/sessions/${sessionId}/messages`, { params: { limit } });

export const sendChatMessage = (sessionId, message) =>
  chatApi.post("/chat", { session_id: sessionId, message });

export default chatApi;

