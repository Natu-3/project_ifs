import axios from "axios";

// 메모 목록 조회
export const getMemos = (userId) => {
  if (!userId) {
    return Promise.resolve({ data: [] });
  }
  return axios.get(`/api/memos?userId=${userId}`, {
    withCredentials: true
  });
};

// 메모 생성
export const createMemo = (userId, content, pinned = false, priority = 2) => {
  if (!userId) {
    return Promise.reject(new Error("로그인이 필요합니다."));
  }
  return axios.post(
    `/api/memos?userId=${userId}`,
    { content, pinned, visible: true, priority },
    { withCredentials: true }
  );
};

// 메모 수정
export const updateMemo = (userId, id, content, pinned = null, priority = null) => {
  if (!userId) {
    return Promise.reject(new Error("로그인이 필요합니다."));
  }
  const body = { content };
  if (pinned !== null) {
    body.pinned = pinned;
  }
  if (priority !== null) {
    body.priority = priority;
  }
  return axios.put(
    `/api/memos/${id}?userId=${userId}`,
    body,
    { withCredentials: true }
  );
};

// 메모 삭제
export const deleteMemo = (userId, id) => {
  if (!userId) {
    return Promise.reject(new Error("로그인이 필요합니다."));
  }
  return axios.delete(`/api/memos/${id}?userId=${userId}`, {
    withCredentials: true
  });
};