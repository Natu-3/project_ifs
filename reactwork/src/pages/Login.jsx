import { useState } from "react";
import { login } from "../api/auth";
import "./Login.css";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const Login = () => {
  const [userid, setUserid] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!userid || !password) {
      alert("아이디와 비밀번호를 입력하세요");
      return;
    }

    try {
      setLoading(true);
      const res = await login(userid, password);
       const { accessToken, userid: userId, auth } = res.data;
      //로그인 성공여부 대기

      //토큰 저장공간 지정
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("userid", userid);
      localStorage.setItem("auth",auth);
      //원래는 cookieStore에 서버단에서 저장해줘야함
      console.log("로그인 성공:", res.data);
      alert("로그인 성공");

      //성공시 홈 화면으로 넘기기
      navigate("/")
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
