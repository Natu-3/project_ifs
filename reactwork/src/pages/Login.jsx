import { useState } from "react";
import { login } from "../api/auth";
import "./Login.css";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const [userid, setUserid] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const {fetchMe} = useAuth();

  const handleLogin = async () => {
  if (!userid || !password) {
    alert("아이디와 비밀번호를 입력하세요");
    return;
  }

  try {
    setLoading(true);

    //  로그인 요청 (쿠키 발급)
    const res = await login(userid, password);

    // (개발용 localStorage 유지)
    const { devToken, userid: uid, auth } = res.data;
    localStorage.setItem("DevToken", devToken);
    localStorage.setItem("userid", uid);
    localStorage.setItem("auth", auth);

    //  쿠키 기반으로 유저 상태 동기화
    await fetchMe();

    console.log("로그인 성공");
    alert("로그인 성공");

    //  이동
    navigate("/");
  } catch (err) {
    console.error(err);
    alert("로그인 실패");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="login-wrapper">
      <div className="login-container">
        <button onClick={() => navigate("/")}>홈</button>
        <h2>로그인</h2>

        <input
          type="text"
          placeholder="User ID"
          value={userid}
          onChange={(e) => setUserid(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={handleLogin} disabled={loading}>
          {loading ? "로그인 중..." : "로그인"}
        </button>

        <button
          className="signup-btn"
          onClick={() => navigate("/Signup")}
        >
          회원가입
        </button>

      </div>
    </div>
  );
};

export default Login;
