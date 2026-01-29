import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Signup.css";

const Signup = () => {
  const [userid, setUserid] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSignup = () => {
    if (!userid || !password) {
      alert("모든 값을 입력하세요");
      return;
    }

    alert("회원가입 완료 (임시)");
    navigate("/login");
  };

  return (
    <div className="login-wrapper">
      <div className="login-container">
        <h2>회원가입</h2>

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

        <button onClick={handleSignup}>회원가입</button>

        <button onClick={() => navigate("/login")}>
          로그인으로 돌아가기
        </button>
      </div>
    </div>
  );
};

export default Signup;
