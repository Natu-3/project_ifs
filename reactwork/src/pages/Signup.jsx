import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signup } from "../api/auth";
import "./Signup.css";

const Signup = () => {
  const [userid, setUserid] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};

    if (!userid || userid.trim() === "") {
      newErrors.userid = "아이디를 입력하세요";
    }

    if (!password || password.trim() === "") {
      newErrors.password = "비밀번호를 입력하세요";
    } else if (password.length < 4) {
      newErrors.password = "비밀번호는 4자 이상이어야 합니다";
    }

    if (!passwordConfirm || passwordConfirm.trim() === "") {
      newErrors.passwordConfirm = "비밀번호 확인을 입력하세요";
    } else if (password !== passwordConfirm) {
      newErrors.passwordConfirm = "비밀번호가 일치하지 않습니다";
    }

    if (!email || email.trim() === "") {
      newErrors.email = "이메일을 입력하세요";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "올바른 이메일 형식이 아닙니다";
    }

    if (!name || name.trim() === "") {
      newErrors.name = "이름을 입력하세요";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async() => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      await signup(userid, password, email, name);

      alert("회원가입 완료");
      navigate("/login");

    } catch (err) {
      console.error("회원가입 오류:", err);

      let errorMessage = "회원가입 실패";
      if (err.response?.data) {
        if (err.response.data.message) {
          errorMessage = err.response.data.message;
        } else if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="signup-container">
        <button className="signup-home-btn" onClick={() => navigate("/")}>홈</button>
        <h2>회원가입</h2>

        <div className="signup-form">
          <div className="signup-input-group">
            <label>아이디</label>
            <input
              type="text"
              placeholder="User ID"
              value={userid}
              onChange={(e) => {
                setUserid(e.target.value);
                if (errors.userid) setErrors({...errors, userid: ""});
              }}
              className={errors.userid ? "error" : ""}
            />
            {errors.userid && <span className="error-message">{errors.userid}</span>}
          </div>

          <div className="signup-input-group">
            <label>비밀번호</label>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors({...errors, password: ""});
                if (passwordConfirm && e.target.value !== passwordConfirm) {
                  setErrors({...errors, passwordConfirm: "비밀번호가 일치하지 않습니다"});
                } else if (passwordConfirm && e.target.value === passwordConfirm) {
                  setErrors({...errors, passwordConfirm: ""});
                }
              }}
              className={errors.password ? "error" : ""}
            />
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

          <div className="signup-input-group">
            <label>비밀번호 확인</label>
            <input
              type="password"
              placeholder="Confirm Password"
              value={passwordConfirm}
              onChange={(e) => {
                setPasswordConfirm(e.target.value);
                if (errors.passwordConfirm) {
                  if (e.target.value === password) {
                    setErrors({...errors, passwordConfirm: ""});
                  } else {
                    setErrors({...errors, passwordConfirm: "비밀번호가 일치하지 않습니다"});
                  }
                } else if (e.target.value !== password) {
                  setErrors({...errors, passwordConfirm: "비밀번호가 일치하지 않습니다"});
                }
              }}
              className={errors.passwordConfirm ? "error" : ""}
            />
            {errors.passwordConfirm && <span className="error-message">{errors.passwordConfirm}</span>}
          </div>

          <div className="signup-input-group">
            <label>이메일</label>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors({...errors, email: ""});
              }}
              className={errors.email ? "error" : ""}
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <div className="signup-input-group">
            <label>이름</label>
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors({...errors, name: ""});
              }}
              className={errors.name ? "error" : ""}
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          <button 
            className="signup-submit-btn" 
            onClick={handleSignup} 
            disabled={loading}
          >
            {loading ? "가입 중..." : "회원가입"}
          </button>

          <button 
            className="signup-login-btn"
            onClick={() => navigate("/login")}
          >
            로그인으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
};

export default Signup;
