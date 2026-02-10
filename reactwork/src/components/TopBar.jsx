import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePosts } from "../context/PostContext";
import '../componentsCss/TopBar.css';

export default function TopBar({ sidebarOpen, setSidebarOpen }) {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { resetPosts } = usePosts();

    const handleLogout = () => {
        resetPosts();
        logout();
        navigate("/login");
    };

    const handleMyPage = () => {
        navigate('/mypage');
    };

    const handleLogin = () => {
        navigate('/login');
    };

    return (
        <div className="topbar">
            <div className="topbar-left">
                <button 
                    className="topbar-hamburger"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    aria-label="메뉴 토글"
                >
                    <span className={`hamburger-line ${sidebarOpen ? 'open' : ''}`}></span>
                    <span className={`hamburger-line ${sidebarOpen ? 'open' : ''}`}></span>
                    <span className={`hamburger-line ${sidebarOpen ? 'open' : ''}`}></span>
                </button>
                <div className="topbar-logo" onClick={() => navigate('/')}>
                    <span className="topbar-logo-text">IfMemo</span>
                </div>
            </div>

            <div className="topbar-right">
                {user ? (
                    <div className="topbar-user">
                        <button 
                            className="topbar-mypage-btn"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const target = e.currentTarget;
                                if (target) {
                                    target.classList.add('clicked');
                                    setTimeout(() => {
                                        if (target) {
                                            target.classList.remove('clicked');
                                        }
                                    }, 200);
                                }
                                handleMyPage();
                            }}
                        >
                            My Page
                        </button>
                        <span className="topbar-user-name">{user.userid || user.name || user.username} 님 환영합니다.</span>
                        <button 
                            className="topbar-logout-btn"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const target = e.currentTarget;
                                if (target) {
                                    target.classList.add('clicked');
                                    setTimeout(() => {
                                        if (target) {
                                            target.classList.remove('clicked');
                                        }
                                    }, 200);
                                }
                                handleLogout();
                            }}
                        >
                            Logout
                        </button>
                    </div>
                ) : (
                    <button 
                        className="topbar-login-btn"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const target = e.currentTarget;
                            if (target) {
                                target.classList.add('clicked');
                                setTimeout(() => {
                                    if (target) {
                                        target.classList.remove('clicked');
                                    }
                                }, 200);
                            }
                            handleLogin();
                        }}
                    >
                        Login
                    </button>
                )}
            </div>
        </div>
    );
}

