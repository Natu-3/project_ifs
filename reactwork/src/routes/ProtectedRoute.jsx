import { Navigate } from "react-router-dom";
//로그인으로만 접근 가능한 페이지 구현용입니다
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("accessToken");

  if (!token) {
    alert("로그인이 필요합니다");
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
