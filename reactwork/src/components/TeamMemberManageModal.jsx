import { useEffect, useMemo, useState } from "react";
import {
  addTeamCalendarMember,
  deleteTeamCalendarMember,
  getTeamCalendarMembers,
  updateTeamCalendarMemberRole,
} from "../api/teamCalendarMember";
import "../componentsCss/TeamMemberManageModal.css";

const ROLE_OPTIONS = ["READ", "WRITE"];

export default function TeamMemberManageModal({
  isOpen,
  onClose,
  calendarId,
  actorUserId,
  readOnly = false,
}) {
  const [userIdentifier, setUserIdentifier] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("READ");
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const title = useMemo(() => {
    if (readOnly) return "멤버 보기";
    return "멤버 관리";
  }, [readOnly]);

  const loadMembers = async () => {
    if (!calendarId || !actorUserId) return;

    try {
      setLoading(true);
      setErrorMessage("");
      const response = await getTeamCalendarMembers(calendarId);
      const list = response.data || [];
      setMembers(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error("멤버 목록 조회 실패:", error);
      setMembers([]);
      setErrorMessage("멤버 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    loadMembers();
  }, [isOpen, calendarId, actorUserId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (readOnly) return;

    const trimmed = userIdentifier.trim();
    if (!trimmed) return;

    try {
      setErrorMessage("");
      await addTeamCalendarMember(calendarId, trimmed, newMemberRole);
      setUserIdentifier("");
      setNewMemberRole("READ");
      await loadMembers();
    } catch (error) {
      console.error("멤버 추가 실패:", error);
      setErrorMessage(error?.response?.data?.message || "멤버 추가에 실패했습니다.");
    }
  };

  const handleRoleChange = async (memberUserId, nextRole) => {
    if (readOnly) return;

    try {
      setErrorMessage("");
        await updateTeamCalendarMemberRole(calendarId, memberUserId, nextRole);
      setMembers((prev) =>
        prev.map((member) =>
          member.userId === memberUserId ? { ...member, roleRw: nextRole } : member
        )
      );
    } catch (error) {
      console.error("멤버 권한 변경 실패:", error);
      setErrorMessage(error?.response?.data?.message || "권한 변경에 실패했습니다.");
    }
  };

  const handleDelete = async (memberUserId) => {
    if (readOnly) return;
    if (!window.confirm("이 멤버를 삭제하시겠습니까?")) return;

    try {
      setErrorMessage("");
      await deleteTeamCalendarMember(calendarId, memberUserId);
      setMembers((prev) => prev.filter((member) => member.userId !== memberUserId));
    } catch (error) {
      console.error("멤버 삭제 실패:", error);
      setErrorMessage(error?.response?.data?.message || "멤버 삭제에 실패했습니다.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="member-modal-overlay" onClick={onClose}>
      <div className="member-modal" onClick={(e) => e.stopPropagation()}>
        <div className="member-modal-header">
          <h3>{title}</h3>
          <button className="member-modal-close" onClick={onClose}>닫기</button>
        </div>

        <p className="member-modal-desc">
          사용자 ID(또는 이메일)를 입력하여 팀 캘린더 멤버를 추가하고 권한을 관리합니다.
        </p>

        <form className="member-form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={userIdentifier}
            onChange={(e) => setUserIdentifier(e.target.value)}
            placeholder="userid 또는 email"
            disabled={readOnly}
          />
          <select
            value={newMemberRole}
            onChange={(e) => setNewMemberRole(e.target.value)}
            disabled={readOnly}
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <button type="submit" disabled={readOnly || !userIdentifier.trim()}>
            멤버 추가
          </button>
        </form>

        {errorMessage && <p className="member-error">{errorMessage}</p>}

        <div className="member-list-wrapper">
          {loading ? (
            <p className="member-empty">불러오는 중...</p>
          ) : members.length === 0 ? (
            <p className="member-empty">공유 멤버가 없습니다.</p>
          ) : (
            <ul className="member-list">
              {members.map((member) => (
                <li key={member.userId} className="member-item">
                  <div>
                    <p className="member-userid">{member.userIdentifier}</p>
                    <p className="member-meta">userId: {member.userId}</p>
                  </div>
                  <div className="member-actions">
                    <select
                      value={member.roleRw}
                      disabled={readOnly}
                      onChange={(e) => handleRoleChange(member.userId, e.target.value)}
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() => handleDelete(member.userId)}
                    >
                      삭제
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}