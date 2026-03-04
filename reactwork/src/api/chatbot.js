import api from "./axios";

export const queryRagChat = ({ question, calendarId, documentIds = [], topK = 6 }) =>
  api.post("/chat/query", { question, calendarId, documentIds, topK });

export const requestDocumentPresign = ({ fileName, contentType, calendarId }) =>
  api.post("/documents/presign", { fileName, contentType, calendarId });

export const completeDocumentUpload = ({ documentId, title, tags = [] }) =>
  api.post(`/documents/${documentId}/complete`, { title, tags });

export const startDocumentIndexing = (documentId) => api.post(`/documents/${documentId}/index`);

export const getDocumentStatus = (documentId) => api.get(`/documents/${documentId}/status`);
