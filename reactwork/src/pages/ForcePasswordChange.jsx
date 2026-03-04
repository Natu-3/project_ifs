import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { changePassword } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import "./ForcePasswordChange.css";

export default function ForcePasswordChange() {
  const navigate = useNavigate();
  const { fetchMe, user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert("모든 비밀번호 입력값이 필요합니다.");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("새 비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    if (newPassword.length < 8) {
      alert("새 비밀번호는 8자 이상이어야 합니다.");
      return;
    }

    try {
      setLoading(true);
      await changePassword(currentPassword, newPassword);
      const me = await fetchMe();
      if (me?.mustChangePassword) {
        alert("비밀번호 변경이 완료되지 않았습니다. 다시 시도해 주세요.");
        return;
      }
      alert("비밀번호가 변경되었습니다.");
      navigate("/");
    } catch (err) {
      const message = err?.response?.data?.message || "비밀번호 변경에 실패했습니다.";
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="force-password-wrapper">
      <form className="force-password-card" onSubmit={onSubmit}>
        <h2>비밀번호 변경</h2>
        <p>보안을 위해 비밀번호를 먼저 변경해야 합니다.</p>
        <input
          type="password"
          placeholder="현재 비밀번호"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <input
          type="password"
          placeholder="새 비밀번호 (8자 이상)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <input
          type="password"
          placeholder="새 비밀번호 확인"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? "변경 중..." : "비밀번호 변경"}
        </button>
      </form>
    </div>
  );
}

