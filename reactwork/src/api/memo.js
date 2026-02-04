import axios from "axios";

// TODO: 실제로는 로그인 후 저장된 userId를 사용해야 함
// 임시로 localStorage에서 가져오거나 기본값 사용
const getUserId = () => {
  // 로그인 정보가 있으면 사용, 없으면 임시로 1 사용
  const raw = localStorage.getItem("userId");
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : 1;
};

// 메모 목록 조회
export const getMemos = () => {
  const userId = getUserId();
  return axios.get(`/api/memos?userId=${userId}`, {
    withCredentials: true
  });
};

// 메모 생성
export const createMemo = (content, pinned = false) => {
  const userId = getUserId();
  return axios.post(
    `/api/memos?userId=${userId}`,
    { content, pinned, visible: true },
    { withCredentials: true }
  );
};

// 메모 수정
export const updateMemo = (id, content, pinned = null) => {
  const userId = getUserId();
  const body = { content };
  if (pinned !== null) {
    body.pinned = pinned;
  }
  return axios.put(
    `/api/memos/${id}?userId=${userId}`,
    body,
    { withCredentials: true }
  );
};

// 메모 삭제
export const deleteMemo = (id) => {
  const userId = getUserId();
  return axios.delete(`/api/memos/${id}?userId=${userId}`, {
    withCredentials: true
  });
};