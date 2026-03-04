import { useEffect, useMemo, useState } from "react";
import {
  getAdminDashboardToday,
  getAdminUsers,
  markAdminResetPasswordRequired,
  updateAdminUserRole,
} from "../api/admin";
import "./AdminPage.css";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [dashboard, setDashboard] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState("");

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [page, setPage] = useState(0);
  const [size] = useState(20);
  const [keyword, setKeyword] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [totalPages, setTotalPages] = useState(1);

  const loadDashboard = async () => {
    try {
      setDashboardLoading(true);
      setDashboardError("");
      const res = await getAdminDashboardToday();
      setDashboard(res.data);
    } catch (err) {
      setDashboardError(err?.response?.data?.message || "대시보드를 불러오지 못했습니다.");
    } finally {
      setDashboardLoading(false);
    }
  };

  const loadUsers = async (nextPage = page, nextKeyword = keyword) => {
    try {
      setUsersLoading(true);
      setUsersError("");
      const res = await getAdminUsers({ page: nextPage, size, keyword: nextKeyword });
      setUsers(res.data.items || []);
      setTotalPages(Math.max(res.data.totalPages || 1, 1));
    } catch (err) {
      setUsersError(err?.response?.data?.message || "사용자 목록을 불러오지 못했습니다.");
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (activeTab === "users") {
      loadUsers();
    }
  }, [activeTab, page, keyword]);

  const onSearch = () => {
    setPage(0);
    setKeyword(keywordInput.trim());
  };

  const onUpdateRole = async (userId, nextAuth) => {
    try {
      await updateAdminUserRole(userId, nextAuth);
      await loadUsers();
    } catch (err) {
      alert(err?.response?.data?.message || "권한 변경에 실패했습니다.");
    }
  };

  const onRequirePasswordReset = async (userId) => {
    try {
      await markAdminResetPasswordRequired(userId);
      await loadUsers();
    } catch (err) {
      alert(err?.response?.data?.message || "비밀번호 변경 요구 설정에 실패했습니다.");
    }
  };

  const pageInfo = useMemo(() => `${page + 1} / ${Math.max(totalPages, 1)}`, [page, totalPages]);

  return (
    <section className="admin-page">
      <div className="admin-header">
        <h1>Admin</h1>
        <div className="admin-tabs">
          <button
            className={activeTab === "dashboard" ? "active" : ""}
            onClick={() => setActiveTab("dashboard")}
          >
            Dashboard
          </button>
          <button
            className={activeTab === "users" ? "active" : ""}
            onClick={() => setActiveTab("users")}
          >
            Users
          </button>
        </div>
      </div>

      {activeTab === "dashboard" && (
        <div className="admin-dashboard">
          <div className="admin-dashboard-actions">
            <button onClick={loadDashboard} disabled={dashboardLoading}>
              {dashboardLoading ? "갱신 중..." : "새로고침"}
            </button>
          </div>
          {dashboardError && <div className="admin-error">{dashboardError}</div>}
          <div className="admin-cards">
            <article className="admin-card">
              <h3>사용자 수</h3>
              <p>{dashboard?.userCount ?? "-"}</p>
            </article>
            <article className="admin-card">
              <h3>오늘 생성 일정</h3>
              <p>{dashboard?.todayScheduleCount ?? "-"}</p>
            </article>
            <article className="admin-card">
              <h3>요약 상태</h3>
              <p>{dashboard?.summaryStatus ?? "-"}</p>
            </article>
          </div>
          <article className="admin-summary">
            <h3>오늘 일정 문맥 요약</h3>
            <pre>{dashboard?.summary || "요약 데이터가 없습니다."}</pre>
          </article>
        </div>
      )}

      {activeTab === "users" && (
        <div className="admin-users">
          <div className="admin-users-toolbar">
            <input
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              placeholder="userid / name / email 검색"
            />
            <button onClick={onSearch}>검색</button>
          </div>
          {usersError && <div className="admin-error">{usersError}</div>}
          <div className="admin-users-table-wrap">
            <table className="admin-users-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>UserID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Password Reset</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersLoading && (
                  <tr>
                    <td colSpan={7}>로딩 중...</td>
                  </tr>
                )}
                {!usersLoading && users.length === 0 && (
                  <tr>
                    <td colSpan={7}>사용자가 없습니다.</td>
                  </tr>
                )}
                {!usersLoading &&
                  users.map((item) => (
                    <tr key={item.id}>
                      <td>{item.id}</td>
                      <td>{item.userid}</td>
                      <td>{item.name || "-"}</td>
                      <td>{item.email || "-"}</td>
                      <td>{item.auth}</td>
                      <td>{item.mustChangePassword ? "Y" : "N"}</td>
                      <td className="admin-actions">
                        {item.auth === "ADMIN" ? (
                          <button onClick={() => onUpdateRole(item.id, "USER")}>USER로 변경</button>
                        ) : (
                          <button onClick={() => onUpdateRole(item.id, "ADMIN")}>ADMIN으로 변경</button>
                        )}
                        <button onClick={() => onRequirePasswordReset(item.id)}>비번 변경 요구</button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="admin-pagination">
            <button onClick={() => setPage((p) => Math.max(p - 1, 0))} disabled={page <= 0}>
              이전
            </button>
            <span>{pageInfo}</span>
            <button
              onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
              disabled={page + 1 >= totalPages}
            >
              다음
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

