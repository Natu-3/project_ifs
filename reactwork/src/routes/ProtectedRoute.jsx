import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// 세션 기반 인증으로만 접근 가능한 페이지 구현용

const ProtectedRoute = ({ children }) => {
  const { user, isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return null;
  }
  if (!user) {
    alert("로그인이 필요합니다");
    return <Navigate to="/login" replace />;
  }
   return children;
};



export default ProtectedRoute;
