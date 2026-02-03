import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signup } from "../api/auth";
import "./Signup.css";

const Signup = () => {
  const [userid, setUserid] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async() => {
    if (!userid || !password) {
      alert("모든 값을 입력하세요");
      return;
    }
  try {
      setLoading(true);

      await signup(userid, password);

      alert("회원가입 완료");
      navigate("/login");

    } catch (err) {
      console.error(err);

      if (err.response?.data?.message) {
        alert(err.response.data.message);
      } else {
        alert("회원가입 실패");
      }
    } finally {
      setLoading(false);
    }
    
  };

  return (
    <div className="login-wrapper">
      <div className="login-container">
        <button onClick={() => navigate("/")}>홈</button>
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

        <button onClick={handleSignup} disabled={loading}>
          {loading ? "가입 중..." : "회원가입"}
        </button>

        <button onClick={() => navigate("/login")}>
          로그인으로 돌아가기
        </button>
      </div>
    </div>
  );
};

export default Signup;
